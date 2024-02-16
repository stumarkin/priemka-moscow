/**
 * @author Sergey Tumarkin https://tumarkin.me
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';
import {BannerIsOverdued, BannerView} from './BannerView';
import { 
  Alert, 
  ScrollView, 
  StyleSheet,
  TextInput,
  View,
  Share
} from 'react-native';
import { Icon } from '@rneui/base'
import { 
  Badge,
  ListItem,
  ThemeProvider, 
  Text, 
  Button, 
  Dialog,
  CheckBox,
  Card,
  Divider,
  Skeleton
} from '@rneui/themed';
import { theme } from './theme';
import * as API from '../data/API';
import * as Config from '../data/Config';


import { init, track } from '@amplitude/analytics-react-native';



const rand5digits = () => (Math.floor(Math.random()*100000));

const inclineWord = ( howMany, ofWhat, humanicStyle = false ) => {
  switch (ofWhat){
      case "недостаток":
          if ([11,12,13,14].includes(howMany)){
              return `${howMany} недостатков`;
          }
          switch ( howMany - (Math.floor(howMany/10)*10) ){
              case 1: return `${howMany} недостаток`
              case 2:
              case 3:
              case 4: return `${howMany} недостатка`
              case 0: if (humanicStyle) {return `пока не нашли недостатков`}
              default: return `${howMany} недостатков`
          }
      
      case "недостатка":
           switch ( howMany ){
              case 1: return `${howMany} недостатка`
              default: return `${howMany} недостатков`
          }
      
      case "проверка":
          if ([11,12,13,14].includes(howMany)){
              return `${howMany} проверок`;
          }
          switch ( howMany - (Math.floor(howMany/10)*10) ){
              case 1: return `${howMany} проверка`
              case 2:
              case 3:
              case 4: return `${howMany} проверки`
              default: return `${howMany} проверок`
          }
      default: return `${howMany} ${ofWhat}`
  }
}

const getDeviceId = async () => {
  let deviceId = await SecureStore.getItemAsync('deviceId');
  if (!deviceId) {
      deviceId = generateId(19);
      await SecureStore.setItemAsync('deviceId', deviceId);
  }
  return deviceId;
}

const escapeBR = (str='') => {
  return str.replace( /<br>/g, "\n")
}

export default function ApartmentScreen ({navigation, route}) {
    const { 
      user,
      address, 
      apartmentNum, 
      customer,
      formId, 
      ProDaysLeft,
      designTypeSelected, 
      designTypes
    } = route.params
    const [deviceId, setDeviceId] = useState(null)
    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [form, setForm] = useState({});
    const [isOverdue, setIsOverdue] = useState(false);
    const overdueAfterSeconds = 60 * 60 *24;
    const [dictionary, setDictionary] = useState({});

    const getPreviousForms = () => route.params.getPreviousForms();
    
    // Dialog Add Room
    // const [checkedRoomId, setCheckedRoomId] = useState();
    const [checkedRoomIdArray, setCheckedRoomIdArray] = useState(['room']);
    const [roomsDialogIsVisible, setRoomsDialogIsVisible] = useState(false);
    const toggleRoomsDialogIsVisible = () => {
      setRoomsDialogIsVisible(!roomsDialogIsVisible);
    };
    
    const addSection = (sectionId, form, room) => {
      const section = JSON.parse(JSON.stringify( form.nested_templates.find( ({id}) => id == sectionId) ));
      section.templateId = section.id;
      section.id = '' + section.templateId + rand5digits();

      section.nested.push( ...form.nested_templates.filter( ({parent}) => parent == sectionId) );
      room.nested.push( JSON.parse(JSON.stringify(section)) );
      return room;
    }

    const addRoom = ( roomId, form, dictionary = dictionary ) => {
      let room =  JSON.parse(JSON.stringify( form.nested_templates.find( ({id}) => id==roomId) ));
      room.name = dictionary[roomId]?.name;
      room.templateId = room.id;
      room.id = '' + room.templateId + rand5digits();
      let defaultNested = null;
      switch (form.designTypeSelected) {
        case 0:
          defaultNested = room.defaultNested0;
          break;
          case 1:
          defaultNested = room.defaultNested1;
          break;
          case 2:
          defaultNested = room.defaultNested2;
          break;
      }
      defaultNested?.forEach( sectionId => {
        room = addSection(sectionId, form, room);
      })
      
      form.apartment.push( room );
      return form;
    }

    const getName = ( obj, showClause = false ) => {
      return obj.name || ( dictionary[ (obj.templateId ? obj.templateId : obj.id) ].report 
                            + ( obj.comment ? ` (${escapeBR(obj.comment)})` : '' )
                            + ( showClause ? `. ${dictionary[ (obj.templateId ? obj.templateId : obj.id) ].clause}` : '' ) 
                          ) ;
    }
    

    // Initial loading
    useEffect(() => {
      getDeviceId()
      .then( deviceId => { 
          setDeviceId(deviceId)
          init(Config.AmplitudeKey, deviceId);
          // track('ApartmentScreen-View'); 
      } )

      API.Get('getdictionary')
      .then( async (res) => {
        const dictionary = res.data ;
        setDictionary( dictionary );
        API.Get( (formId ? { method:'getform', id: formId} : 'getform') )
        .then(res => { 
            let form = res.data;

            if (!formId) {
              form.address = address;
              form.apartmentNum = apartmentNum;
              form.customer = customer;
              form.designTypeSelected = designTypeSelected;
              form.timestampCreate = Date.now();
              // default rooms
              ['room', 'kitchen', 'bathroom', 'general'].forEach( room => {
                form = addRoom(room, form, dictionary );
              })
            }
            setAddressInput( form.address );
            setApartmentNumInput( form.apartmentNum );
            setCustomerInput( form.customer );
            setForm( form );
            setIsOverdue( ProDaysLeft ? false : Math.floor((Date.now() - form.timestampCreate)/1000) > overdueAfterSeconds )
            setIsInitialLoading(false)
        })
      })
    }, []);

     // Configure navbar title and button
     useEffect(() => {
        // track('RoomScreen-View'); 
        navigation.setOptions({
            title: form.address,
            headerRight: () => (
                !isOverdue ? (<Icon 
                    name="more-horizontal" 
                    type="feather" 
                    color={theme.lightColors.primary}
                    onPress={()=>{
                        toggleApartmentAddressDialogIsVisible()
                    }}
                /> ) : null
            ),
        });
      }, [navigation, form.address]
    )


  
    // Sending form to server
    const sendForm = ( ) => {
        form.deviceid = deviceId;
        setForm(form);
        let data = new FormData();
        const summary = {
            timestamp: Date.now(),
            address: form.address,
            apartmentNum: form.apartmentNum,
            customer: form.customer,
            checksCountTotal: form.apartment
                .map(room => {
                    return room.nested
                        .map(section => (section.nested.reduce((sum, check) => (sum += 1), 0)))
                        .reduce((sum, sectionChecksCount) => {
                            return sum += sectionChecksCount
                        }, 0)
                })
                .reduce((sum, roomChecksCountInAllSections) => {
                    return sum += roomChecksCountInAllSections
                }, 0),
            failChecksCountTotal: form.apartment
                .map(room => {
                    return room.nested
                        .map(section => (section.nested.reduce((sum, check) => (sum += check.value === false ? 1 : 0), 0)))
                        .reduce((sum, sectionChecksCount) => {
                            return sum += sectionChecksCount
                        }, 0)
                })
                .reduce((sum, roomChecksCountInAllSections) => {
                    return sum += roomChecksCountInAllSections
                }, 0),
        }
        data.append('userid', user.id );
        data.append('form',  JSON.stringify(form));
        data.append('summary', JSON.stringify(summary) );
        setIsLoading(true);

        API.Post( {method: 'setform', token: form.token}, data )
        .then( response => {
            // AsyncStorage.setItem(`form_${form.id}`, JSON.stringify(summary));
            getPreviousForms();
        })
        .catch(err => {
            console.log('SendForm failed: ' + err);
        })
        .finally(()=>{
            setIsLoading(false);
        });
    }

    const getFailChecks = ( form, showClause = false) => {
      let i = 1
      const failChecks = form?.apartment
        .map( (room) => (
          {
            ...room, 
            sections: room.nested.reduce( (sections, section ) => {
                        const checks = section.nested.reduce( (checks, check) => {
                          return checks += (!check.value ? `${i++}. ${getName(check, showClause)}\n\n` : '')
                        }, '' )
                        return sections += (checks!='' ? `${getName(section).toUpperCase()}:\n\n${checks}` : '')
                      }, '') +  (room.comment.length>0 ? `Другое:\n${i++} ${escapeBR(room.comment)}\n` : '' )
          }
        ))
        .reduce( (sum, room) => ( sum += (room.sections!='' ? `\n___________________________________\n\n${room.name.toUpperCase()}\n___________________________________\n\n${room.sections}\n` : '') ), '' ) 
    
      return `#${form.id}\n\nВ результате осмотра квартиры по адресу ${form.address}, ${form.apartmentNum} ` +
              `выявлены следующие недостатки:\n`+
              `${failChecks}`;
    }


    // Dialog Apartment Address
    const [apartmentAddressDialogIsVisible, setApartmentAddressDialogIsVisible] = useState(false);
    const toggleApartmentAddressDialogIsVisible = () => {
        setApartmentAddressDialogIsVisible(!apartmentAddressDialogIsVisible);
    };
    const [addressInput, setAddressInput] = useState('');
    const [apartmentNumInput, setApartmentNumInput] = useState('');
    const [customerInput, setCustomerInput] = useState('');

    
    
    
   
    

    // Dialog Apartment Delete
    const [apartmentDeleteDialogIsVisible, setApartmentDeleteDialogIsVisible] = useState(false);
    const toggleApartmentDeleteDialogIsVisible = () => {
      setApartmentDeleteDialogIsVisible(!apartmentDeleteDialogIsVisible);
    };

    const deleteApartment = () => {
        if (form.id) {
            API.Get( {
              method: 'deleteform',
              id: form.id,
              token: form.token
            })
            .then( res=> {
                if (res.data.result){
                    AsyncStorage.removeItem(`form_${form.id}`)
                    getPreviousForms()
                    Alert.alert('Её больше нет!')
                    navigation.goBack()
                } else {
                    console.log('Server deleteApartment failed: ' + res.data);
                }
            })
            .catch(err => {
                console.log('Server deleteApartment failed: ' + err);
            });
        }
    }

  
    // Skeletons
    if (isInitialLoading){
      return (
        <View style={{ padding: 20 }}>
          <ThemeProvider theme={theme} >
            <Skeleton key={2} animation="pulse" height={150} style={{borderRadius:10 }}/>
            <Divider  key={3} width={10} style={{ opacity: 0 }} />
            <Skeleton key={4} animation="pulse" height={400} style={{borderRadius:10 }}/>
          </ThemeProvider>
        </View>
      )
    }

    let checksCountTotal = 0;
    let failChecksCountTotal = 0;
    
    const apartmentRoomsUI = form.apartment ? form.apartment.map( room => {
        const checksCount = room.nested.reduce( (sum, section) => (sum + section.nested.reduce( (sectionSum, check) => ( sectionSum + 1), 0 )), 0);
        checksCountTotal += checksCount;
        
        const failChecksCount = room.nested.reduce( (sum, section) => (sum + section.nested.reduce( (sectionSum, check) => ( sectionSum + ( !check.value ? 1 : 0)), 0 )), 0);
        failChecksCountTotal += failChecksCount;

        return (
          <>
            <ListItem 
              key={room.id}
              containerStyle={{paddingHorizontal: 0, paddingVertical: 5}}

              onPress={
                () => { navigation.navigate('Room', { 
                  title: room.name,
                  dictionary,
                  form,
                  setForm,
                  sendForm,
                  room, 
                  roomId: room.id, 
                  isOverdue
                })}
              }
            >
                <ListItem.Content>
                    <ListItem.Title style={{fontWeight: 600}}>
                        {room.name} {failChecksCount ? <Badge value={failChecksCount} status="error"/> : ''} 
                    </ListItem.Title>
                    {
                        checksCount>0 ? (
                            <ListItem.Subtitle style={{color: 'grey'}}>{inclineWord(checksCount, "проверка")}</ListItem.Subtitle>
                        ): null
                    }
                </ListItem.Content>
                <ListItem.Chevron color={theme.lightColors.primary} containerStyle={{ height: 32 }}/>
            </ListItem>
            <Divider key={room.id+'d'} width={10} style={{ opacity: 0 }} />
          </>

        )
    }) : null


    return (
      <>
      { isLoading ? <Text key={'isLoading'} style={{ backgroundColor: "#FEBE00", textAlign: "center", fontSize: 12, padding: 5 }}>Обновление данных</Text> : null }
      <ScrollView style={{ padding: 20}}>
        <ThemeProvider theme={theme} >
                
          { 
              isOverdue ? (
                  <BannerIsOverdued key='isOverdued'/> 
              ) : null
          }

          {/* <BannerView 
              key={"address"}
              header="Адрес квартиры"
              actionControls={
                  <TextInput
                      style={{
                          height: 40,
                          borderBottomColor: theme.lightColors.grey4,
                          borderBottomWidth: 2,
                          fontSize: 19,
                          padding: 0,
                          marginBottom: 10
                          }}
                      onChangeText={ setAddressInput }
                      onEndEditing={ onEndEditingAddress }
                      value={addressInput}
                      placeholder="Введите адрес"
                  />
              }
          /> */}


          <BannerView 
              key={"report"}
              header="Отчет"
              text={`Всего ${inclineWord(checksCountTotal, "проверка")} и в них ${inclineWord(failChecksCountTotal, "недостаток", true)}`}
              button={
                <>
                   <Button
                        key='list'
                        onPress={() => {
                            // track('ApartmentScreen-List-Press', { failChecksCountTotal });
                            navigation.navigate('FailChecksList', { title: 'Список недостатков', content: getFailChecks(form), contentWithClauses: getFailChecks(form, true), ProDaysLeft })
                        }}
                        disabled={failChecksCountTotal == 0}
                        buttonStyle={{ marginBottom: 10, backgroundColor: '#EEE' }}
                        titleStyle={{ color: '#000' }}
                    >
                        Список недостатков
                    </Button>
                      <View style={{alignContent: 'space-between', flexDirection: 'row'}}>
                          <View style={{width:'45%'}}>    
                              <Button
                                  key='list'
                                  onPress={() => {
                                    // track('ApartmentScreen-Blank-Press', { failChecksCountTotal });
                                    navigation.navigate('Webview', { title: 'Акт осмотра', url: `${Config.Domain}/report/${form.id}`, isSharable: true })
                                }}
                                  disabled={failChecksCountTotal == 0}
                                  buttonStyle={{ marginRight: 5, backgroundColor: theme.lightColors.primary }}
                              >
                                  Акт осмотра
                              </Button>
                          </View>
                          <View style={{width:'55%'}}>    
                              <Button
                                  key='blank'
                                  onPress={() => {
                                      // track('ApartmentScreen-Blank-Press', { failChecksCountTotal });
                                      navigation.navigate('Webview', { title: 'Заключение', url: `${Config.Domain}/report/${form.id}?expert&token=${form.token}`, isSharable: true })
                                  }}
                                  disabled={failChecksCountTotal == 0}
                                  buttonStyle={{ marginLeft: 5, backgroundColor: theme.lightColors.primary }}
                              >
                                  ✨Заключение
                              </Button>
                          </View>
                      </View>
                </>
              }
          />


          <BannerView 
              key={"rooms"}
              header="Помещения и проверки"
              text={ !form.apartment.length ? `Пока не добавлено ни одной комнаты` : null }
              actionControls={apartmentRoomsUI}
              button={
                  <Button 
                      type="clear"
                      disabled={isOverdue}
                      onPress={()=>{
                          // track('ApartmentScreen-AddRoom-Press');
                          toggleRoomsDialogIsVisible()
                      }}
                  >
                      <Icon type='ionicon' name="add-circle-outline" color={theme.lightColors.primary} /> Добавить помещение
                  </Button>
              }
          />
          
          {/* <Text style={{textAlign: 'center'}}>{JSON.stringify( user )}</Text> */}


          {
            formId && ProDaysLeft ? (
                <Button 
                      key='deleteButton'
                      title="Удалить эту приёмку"
                      type="clear"
                      titleStyle={{ color: "grey"}}
                      onPress={toggleApartmentDeleteDialogIsVisible}
                      style={{marginBottom:40}}
                  />
            ) : null
          }
          
          <Divider key='lastdivider' width={10} style={{ opacity: 0 }} />
        

          <Dialog
              key={'apartmentAddress'}
              isVisible={apartmentAddressDialogIsVisible}
              onBackdropPress={toggleApartmentAddressDialogIsVisible}
          >
              <Text style={{fontSize: 22, fontWeight: 700}}>
                  Адрес объекта и заказчик
              </Text>
              
              <View style={{ alignItems: 'flex-end' }}>

                  <TextInput
                      style={{
                          height: 40,
                          borderBottomColor: theme.lightColors.grey4,
                          borderBottomWidth: 2,
                          fontSize: 19,
                          padding: 0,
                          marginBottom: 20,
                          width: '100%'
                      }}
                      onChangeText={ setAddressInput }
                      value={ addressInput }
                      placeholder="Город, улица, дом, корпус"
                  />

                  <TextInput
                      style={{
                          height: 40,
                          borderBottomColor: theme.lightColors.grey4,
                          borderBottomWidth: 2,
                          fontSize: 19,
                          padding: 0,
                          marginBottom: 40,
                          width: 80,
                          alignCo: 'right'
                      }}
                      onChangeText={ setApartmentNumInput }
                      value={ apartmentNumInput }
                      placeholder="№ кв"
                  />

                  <TextInput
                      style={{
                          height: 40,
                          borderBottomColor: theme.lightColors.grey4,
                          borderBottomWidth: 2,
                          fontSize: 19,
                          padding: 0,
                          marginBottom: 10,
                          width: '100%'
                          }}
                      onChangeText={ setCustomerInput }
                      value={ customerInput }
                      placeholder="ФИО заказчика"
                  />
              </View>

              <Dialog.Actions>
                  <Button 
                      title="Сохранить"
                      style={{ width: 150}} 
                      onPress={ ()=>{
                          // track('ApartmentScreen-EditAddress-Press', { address } );
                          form.address = addressInput.trim(); 
                          form.apartmentNum = apartmentNumInput.trim(); 
                          form.customer = customerInput.trim(); 
                          sendForm()
                          toggleApartmentAddressDialogIsVisible();
                      }} 
                  />
              </Dialog.Actions>
          </Dialog>

          <Dialog
            key={'addroom'}
            isVisible={roomsDialogIsVisible}
            onBackdropPress={toggleRoomsDialogIsVisible}
          >
            <Dialog.Title title="Какое помещение добавить?"/>
            {form?.nested_templates?.filter( item => (item.type=='room') ).map((item, i) => (
                <CheckBox
                  key={i}
                  title={dictionary[item.id].name}
                  containerStyle={{ backgroundColor: 'white', borderWidth: 0 }}
                  textStyle={{ fontSize: 16}}
                  checkedIcon={
                    <Icon
                        name="square"
                        type="ionicon"
                        size={18}
                    />
                  }
                  uncheckedIcon={
                    <Icon
                        name="square-outline"
                        type="ionicon"
                        size={18}
                    />
                  }
                  checked={checkedRoomIdArray.includes( item.id )}
                  onPress={() => setCheckedRoomIdArray( checkedRoomIdArray.includes(item.id) ? checkedRoomIdArray.filter( room => room != item.id) : checkedRoomIdArray.concat([item.id]) ) }
                />
            ))}
            <Dialog.Actions>
                <Dialog.Button
                  title="Добавить"
                  onPress={() => {
                      // track('ApartmentScreen-AddRoom-DialogRoomChoise-Press' );
                      checkedRoomIdArray.forEach( room => {
                        setForm( addRoom(room, form, dictionary ) );
                      })
                      setCheckedRoomIdArray([]);
                      sendForm(); 
                      toggleRoomsDialogIsVisible();
                  }}
                />
                <Dialog.Button title="Отмена" onPress={toggleRoomsDialogIsVisible} />
            </Dialog.Actions>
          </Dialog>


          <Dialog
                key={'confirmDelete'}
                isVisible={apartmentDeleteDialogIsVisible}
                onBackdropPress={toggleApartmentDeleteDialogIsVisible}
            >
                <Dialog.Title title="Точно удалить?"/>
                <Text>
                    Удалить квартиру и все выбранные для неё проверки и выявленные недостатки? Данное действие необратимо.
                </Text>
                <Dialog.Actions>
                    <Dialog.Button
                        title="Отменить"
                        onPress={toggleApartmentDeleteDialogIsVisible}
                    />
                    <Dialog.Button 
                        titleStyle={{color: "red"}}
                        title="Да, удалить" 
                        onPress={()=>{
                            deleteApartment(form)
                            toggleApartmentDeleteDialogIsVisible()
                        }} 
                    />
                </Dialog.Actions>
            </Dialog>
            
        </ThemeProvider>
      </ScrollView>
      </>
    )
    
  };

  const styles = StyleSheet.create({
    mb10: {
      marginBottom: 10,
    },
    ml10: {
      paddingLeft: 20,
    },
  });