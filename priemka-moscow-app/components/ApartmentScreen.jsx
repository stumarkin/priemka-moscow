/**
 * @author Sergey Tumarkin https://tumarkin.me
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {BannerView} from './BannerView';
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
  Input,
  Divider,
  Skeleton
} from '@rneui/themed';
import { theme } from './theme';
import * as API from '../data/API';
import * as Config from '../data/Config';


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

const escapeBR = (str='') => {
  return str.replace( /<br>/g, "\n")
}

export default function ApartmentScreen ({navigation, route}) {
    const { 
		appIsOffline,
		formIsOffline, 
		template,
		authtoken,
		featuretoggles,
		plan,
		address, 
		apartmentNum, 
		customer,
		formId,
		designTypeSelected, 
    } = route.params
    const getForms = () => route.params.getForms();
    const AmplitudeTrack = (event, obj) => route.params.AmplitudeTrack(event, obj);

    const dictionary = template.dictionary;

    const [isLoading, setIsLoading] = useState(false);
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [form, setForm] = useState({});
    const [formImagesCount, setFormImagesCount] = useState(0);
    const [lastFormUpdate, setLastFormUpdate] = useState( null );
    const [isFormTemplateVersionActual, setIsFormTemplateVersionActual] = useState( true );

	const [addressInput, setAddressInput] = useState( address );
    const [apartmentNumInput, setApartmentNumInput] = useState( apartmentNum );
    const [customerInput, setCustomerInput] = useState( customer );
    
	const addSection = (sectionId, form, room) => {
		try {
			const section = JSON.parse(JSON.stringify(form.nested_templates.find(({ id }) => id == sectionId)));
			section.templateId = section.id;
			section.id = '' + section.templateId + rand5digits();
			//deprecated
			//adding checks
			if (section.nested.length == 0){
				section.nested.push(...form.nested_templates.filter(({ parent }) => parent == sectionId));
			}
			room.nested?.push(JSON.parse(JSON.stringify(section)));
		} catch ({ name, message }) {
			Alert.alert(`Ошибка добавления набора проверок ${sectionId}`, `${name}\n${message}`)
			console.log(err);
		} finally {
			return room;
		}
	}

	const addRoom = (roomId, form, dictionary) => {
		try {
			let room = JSON.parse(JSON.stringify(form.nested_templates.find(({ id }) => id == roomId)));
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
			defaultNested?.forEach(sectionId => {
				room = addSection(sectionId, form, room);
			})
			form.apartment.push(room);
		} catch ({ name, message }) {
			Alert.alert(`Ошибка добавления комнаты ${roomId}`, `${name}\n${message}`)
			console.log(err);
		} finally {
			return form;
		}
	}

    const getName = ( obj, showClause = false ) => {
      return obj.name || ( dictionary[ (obj.templateId ? obj.templateId : obj.id) ].report 
                            + ( obj.comment ? ` (${escapeBR(obj.comment)})` : '' )
                            + ( showClause ? `. ${dictionary[ (obj.templateId ? obj.templateId : obj.id) ].clause}` : '' ) 
                          ) ;
    }
    
	const createOnlineForm = ( form, doConvertOfflineToOnline = false ) => {
		let data = new FormData();
		data.append('form',  JSON.stringify(form));
		data.append('summary', JSON.stringify({
			timestamp: Date.now(),
			address,
			apartmentNum,
			customer,
			checksCountTotal: 0,
			failChecksCountTotal: 0,
			imagesCountTotal: 0
		}) );
		
		API.Post({method: 'createform', authtoken}, data )
		.then( res => {
			const {id, token} = res.data
			if( id && token ){
				setForm( {...form, id, token} )
				updateOnlineForm( {...form, id, token}, doConvertOfflineToOnline )
			}
		})
		.catch( err => console.log('API: createform failed: ' + err) )
	}

	const updateOnlineForm = ( form, doConvertOfflineToOnline = false ) => {
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
			imagesCountTotal: form.apartment
								.map(room => {
									return room.nested
										.map(section => (section.nested.reduce((sum, check) => (sum += check.image ? 1 : 0), 0)))
										.reduce((sum, sectionChecksCount) => {
											return sum += sectionChecksCount
										}, 0)
								})
								.reduce((sum, roomChecksCountInAllSections) => {
									return sum += roomChecksCountInAllSections
								}, 0)
		}
		let data = new FormData();
		data.append('id', form.id );
		data.append('form',  JSON.stringify(form));
		data.append('summary', JSON.stringify(summary) );
		API.Post({method: 'updateform', authtoken}, data )
		.then( ({data}) => {
			if (data.result){
				if (doConvertOfflineToOnline){
					deleteOfflineForm('form_' + form.offlineId)
				}
				setLastFormUpdate( Date.now() )
				setIsInitialLoading(false)
			}
		} )
		.catch( err => console.log('API: updateform failed: ' + err) )

	}
 
    const saveForm = ( doConvertOfflineToOnline = false ) => {
		setForm(form)
       
		if (formIsOffline && !doConvertOfflineToOnline) {
			AsyncStorage.setItem( `form_${form.offlineId}`, JSON.stringify( form ))
			setLastFormUpdate( Date.now() )
		} else {
			updateOnlineForm( {...form, id: (formId || form.id)} ) // formId -> id = workaround for editing demo forms (demoXX!=demo)
		}
    }

	const convertOfflineFormToOnlineForm = ( form ) => {
		if (form.isOffline){
			delete form.isOffline
			form.wasOffline = true
			const doConvertOfflineToOnline = true
			createOnlineForm( form, doConvertOfflineToOnline)
		} else {
			Alert.alert('Это не оффлайн форма', 'Изменения не выполнены')
		}
	}

    const getFailChecks = ( form, showClause = false) => {
      let i = 1
      const failChecks = form?.apartment
        .map( (room) => (
          {
            ...room, 
            sections: room.nested.reduce( (sections, section ) => {
                        const checks = section.nested.reduce( (checks, check) => {
                          return checks += (!check.value ? `${i++}. ${getName(check, showClause)}\n` : '')
                        }, '' )
                        return sections += (checks!='' ? `\n${getName(section).toUpperCase()}:\n\n${checks}` : '')
                      }, '') +  (room.comment.length>0 ? `Другое:\n${i++} ${escapeBR(room.comment)}\n` : '' )
          }
        ))
        .reduce( (sum, room) => ( sum += (room.sections!='' ? `\n\n🔸 ${room.name.toUpperCase()} \n${room.sections}\n` : '') ), '' ) 
    
      return `#${form.id}\n\nВ результате осмотра квартиры по адресу ${form.address}, ${form.apartmentNum} ` +
              `выявлены следующие недостатки:\n`+
              `${failChecks}`;
    }

	const deleteOfflineForm = ( key ) => {
		AsyncStorage.removeItem( key )
		.then(()=>{
			// getForms()
			Alert.alert('Офлайн приёмка удалена', key)
			navigation.goBack()
		})
	}

	function removeControlCharacters(jsonString) {
		// Use a regular expression to replace control characters with an empty string
		return jsonString.replace(/[\u0000-\u001F]/g, '<br>');
	}

    const deleteOnlineForm = ( id ) => {
		API.Get( { method: 'deleteform', id, authtoken })
		.then( ({data})=> {
			console.log(data);
			if (data.result){
				getForms()
				Alert.alert('Приёмка удалена', id)
				navigation.goBack()
			} else {
				console.log('Server deleteApartment failed:')
				console.log(data)
			}
		})
		.catch(err => {
			console.log('Server deleteApartment failed: ' + err)
		});
	}

    // Initial
	useEffect(() => {

			const renderForm = ( form ) => {
				const {address, apartmentNum, customer, formTemplateVersion} = form
				setAddressInput(address)
				setApartmentNumInput(apartmentNum)
				setCustomerInput(customer)
				setForm(form)
				setIsInitialLoading(false)
				setIsFormTemplateVersionActual( formTemplateVersion == template.version )
			}
			
			if ( formId ) {
				if (formIsOffline) {
					AsyncStorage.getItem( formId )
					.then( form_json => renderForm( JSON.parse(form_json) ))
				} else {
					API.Get({ method: 'getform', id: formId, authtoken })
					.then( ({data}) => {
						let form;
						try {
							form = JSON.parse(data.form);
						} catch (e) {
							Alert.alert("Ошибка загрузки", `${formId}\n${e.toString()}\n\nОтправьте скриншот этой ошибки разработчику.`)
							setIsInitialLoading(false)
							form = JSON.parse(removeControlCharacters(data.form))
							// return console.error(e); // error in the above string (in this case, yes)!
						}
						renderForm( form ) 
					}
				)
				}
			} else {
				let form = JSON.parse(JSON.stringify( {...template.form, authtoken, address, apartmentNum, customer, designTypeSelected, timestampCreate: Date.now()} ));
				// default rooms
				// ['room', 'kitchen', 'bathroom', 'general']
				// .forEach( room => {
				// 	form = addRoom(room, form, dictionary);
				// })

				if (formIsOffline) {
					form.offlineId = Date.now()
					form.isOffline = true
					setForm( form )
					setIsInitialLoading(false)
				} else {
					createOnlineForm( form )
				}
			}

			AmplitudeTrack('App-ApartmentScreen-View'); 


	}, []);

     // Configure navbar title and button
     useEffect(() => {
        AmplitudeTrack('App-RoomScreen-View'); 
        navigation.setOptions({
            // title: form.address,
            headerRight: () => (
                <Icon 
                    name="more-horizontal" 
                    type="feather" 
                    color={theme.lightColors.primary}
                    onPress={()=>{
                        toggleApartmentAddressDialogIsVisible()
                    }}
                />
            ),
        });
      }, [navigation, form.address]
    )


    // Dialog Add Room
    const [checkedRoomIdArray, setCheckedRoomIdArray] = useState([]);
    const [roomsDialogIsVisible, setRoomsDialogIsVisible] = useState(false);
    const toggleRoomsDialogIsVisible = () => {
    	setRoomsDialogIsVisible(!roomsDialogIsVisible);
    };

    // Dialog Apartment Address
    const [apartmentAddressDialogIsVisible, setApartmentAddressDialogIsVisible] = useState(false);
    const toggleApartmentAddressDialogIsVisible = () => {
        setApartmentAddressDialogIsVisible(!apartmentAddressDialogIsVisible);
    };

    // Dialog Apartment Delete
    const [apartmentDeleteDialogIsVisible, setApartmentDeleteDialogIsVisible] = useState(false);
    const toggleApartmentDeleteDialogIsVisible = () => {
      setApartmentDeleteDialogIsVisible(!apartmentDeleteDialogIsVisible);
    };
  
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
    let imagesCountTotal = 0;
    
    const apartmentRoomsUI = form.apartment ? form.apartment.map( room => {
        const checksCount = room.nested.reduce( (sum, section) => (sum + section.nested.reduce( (sectionSum, check) => ( sectionSum + 1), 0 )), 0);
        checksCountTotal += checksCount;
        
        const failChecksCount = room.nested.reduce( (sum, section) => (sum + section.nested.reduce( (sectionSum, check) => ( sectionSum + ( !check.value ? 1 : 0)), 0 )), 0);
        failChecksCountTotal += failChecksCount;

        const imagesCount = room.nested.reduce( (sum, section) => (sum + section.nested.reduce( (sectionSum, check) => ( sectionSum + ( check.image ? 1 : 0)), 0 )), 0);
        imagesCountTotal += imagesCount;

        return (
          <>
            <ListItem 
              key={room.id}
              containerStyle={{paddingHorizontal: 0, paddingVertical: 5}}
			  disabled={!isFormTemplateVersionActual}
              onPress={
                () => { 
					navigation.navigate('Room', 
					{ 
						AmplitudeTrack,
						title: room.name,
						authtoken,
						dictionary,
						form,
						setForm,
						saveForm,
						room, 
						roomId: room.id,
						featuretoggles,
						plan,
						formImagesCount,
						formIsOffline
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
				{
					isFormTemplateVersionActual ? (
						<ListItem.Chevron color={theme.lightColors.primary} containerStyle={{ height: 32 }}/>
					):(
						<ListItem.Chevron color={theme.lightColors.grey} containerStyle={{ height: 32 }} type='material-community' name="lock"/>
					)
				}
            </ListItem>
            <Divider key={room.id+'d'} width={10} style={{ opacity: 0 }} />
          </>

        )
    }) : null

	const minAfterLastUpdate = Math.floor((Date.now() - lastFormUpdate) / (1000*60))

    return (
      <>
      { isLoading ? <Text key={'isLoading'} style={{ backgroundColor: "#FEBE00", textAlign: "center", fontSize: 12, padding: 5 }}>Обновление данных</Text> : null }
      <ScrollView style={{ padding: 20}}>
        <ThemeProvider theme={theme} >

			{ !isFormTemplateVersionActual && (
				<BannerView 
					key={'formIsOffline'} 
					header={
						<>
							<Icon type='material-community' name="lock" color={'white'} /> Версия устарела
						</>
					} 
					text='Эта приёмка создана на предыдущей версии справочников (структура приёмки). Ее больше нельзя редактировать.' 
					backgroundColor="#d5b895" 
					textColor="#fff"
				/>
			) 
			}

			{ formIsOffline ? (
				<BannerView 
					key={'formIsOffline'} 
					header={
						<>
							<Icon type='material-community' name="signal-off" color={'white'} /> Оффлайн приёмка
						</>
					} 
					text='Все измемения сохраняются локально на устройстве. Для получения отчета или заключения необходимо сохранить эту приёмку на сервер (при наличии подключения)' 
					backgroundColor="#b6737c" 
					textColor="#fff"
					button={
							<Button
									key='saveOnline'
									onPress={() => {
										AmplitudeTrack('App-ApartmentScreen-List-Press', { failChecksCountTotal });
										convertOfflineFormToOnlineForm( form )
									}}
									buttonStyle={{ backgroundColor: '#EEE' }}
									titleStyle={{ color: '#000' }}
									disabled={appIsOffline}
								>
									Сохранить на сервер
							</Button>
					}
				/>
			) : (
				<>	
          			{ lastFormUpdate && <Text style={{textAlign: 'center'}}>Сохранено { minAfterLastUpdate>0 ? `${minAfterLastUpdate} мин назад` : 'только что'} </Text>}
					
					<BannerView 
						key={"report"}
						header="Отчет"
						text={`Всего ${inclineWord(checksCountTotal, "проверка")} и в них ${inclineWord(failChecksCountTotal, "недостаток", true)} ${( imagesCountTotal ? `с ${imagesCountTotal} фото` : '')}`}
						button={
							<>
								<Button
									key='list'
									onPress={() => {
										AmplitudeTrack('App-ApartmentScreen-List-Press', { failChecksCountTotal });
										navigation.navigate('FailChecksList', { title: 'Список недостатков', content: getFailChecks(form), contentWithClauses: getFailChecks(form, true) })
									}}
									disabled={failChecksCountTotal == 0 || !isFormTemplateVersionActual }
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
												AmplitudeTrack('App-ApartmentScreen-Blank-Press', { failChecksCountTotal });
												navigation.navigate('Webview', { title: 'Акт осмотра', url: `${Config.Domain}/report/${(formId || form.id)}`, isSharable: true })
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
												AmplitudeTrack('App-ApartmentScreen-Blank-Press', { failChecksCountTotal });
												navigation.navigate('Webview', { title: 'Заключение', url: `${Config.Domain}/report/${(formId || form.id)}?expert&token=${form.token}`, isSharable: true })
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
				</>
			)}


			{ 
				form.apartment && 
				<BannerView 
					key={"rooms"}
					header="Помещения и проверки"
					text={ !form.apartment.length ? `Пока не добавлено ни одной комнаты` : null }
					actionControls={apartmentRoomsUI}
					button={
						<Button 
							type="clear"
							onPress={()=>{
								AmplitudeTrack('App-ApartmentScreen-AddRoom-Press');
								toggleRoomsDialogIsVisible()
							}}
						>
							<Icon type='ionicon' name="add-circle-outline" color={theme.lightColors.primary} /> Добавить помещение
						</Button>
					}
				/>
			}
          
          {
            formId ? (
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

				<Input
					onChangeText={ setCustomerInput }
					value={ customerInput }
					placeholder="ФИО заказчика"
				/>
				<Input
					onChangeText={ setAddressInput }
					value={ addressInput }
					placeholder="Город, улица, дом, корпус"
				/>
				<Input
					onChangeText={ setApartmentNumInput }
					value={ apartmentNumInput }
					placeholder="№ кв"
				/>
              </View>

              <Dialog.Actions>
                  <Button 
                      title="Сохранить"
                      style={{ width: 150}} 
                      onPress={ ()=>{
                          AmplitudeTrack('App-ApartmentScreen-EditAddress-Press', { address } );
                          form.address = addressInput.trim(); 
                          form.apartmentNum = apartmentNumInput.trim(); 
                          form.customer = customerInput.trim(); 
                          saveForm()
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
                  title={dictionary[item.id]?.name}
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
                      AmplitudeTrack('App-ApartmentScreen-AddRoom-DialogRoomChoise-Press' );
                      checkedRoomIdArray.forEach( room => {
                        setForm( addRoom(room, form, dictionary ) );
                      })
                      setCheckedRoomIdArray([]);
                      saveForm(); 
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
							if (form.isOffline){
								deleteOfflineForm(formId)
							} else {
								deleteOnlineForm(formId)
							}
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