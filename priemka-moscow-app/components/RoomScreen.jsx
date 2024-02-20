import { useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import {BannerIsOverdued} from './BannerView';
import { 
    ScrollView, 
    StyleSheet, 
    TextInput,
    View,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
} from 'react-native';
import { 
    Badge,
    Button, 
    CheckBox,
    Dialog,
    Divider,
    Icon,
    ListItem,
    Switch,
    Text,
    ThemeProvider, 
} from '@rneui/themed';
import { theme } from './theme';
import * as Haptics from 'expo-haptics';
import * as Config from '../data/Config';
import { init, track } from '@amplitude/analytics-react-native';
import { useHeaderHeight } from '@react-navigation/elements'


const getDeviceId = async () => {
    let deviceId = await SecureStore.getItemAsync('deviceId');
    if (!deviceId) {
        deviceId = generateId(19);
        await SecureStore.setItemAsync('deviceId', deviceId);
    }
    return deviceId;
}


const rand5digits = () => (Math.floor(Math.random()*100000));

const inclineWord = ( howMany, ofWhat ) => {
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
    }
}


const escapeN = (str) => {
    return str.replace( /\n/g, "<br>")
  }

  
const escapeBR = (str) => {
    return str.replace( /<br>/g, "\n")
  }



export default function RoomScreen ({navigation, route}) {
    const [deviceId, setDeviceId] = useState(null)
    const [isLoading, setIsLoading] = useState(true);
    const dictionary = route.params.dictionary;
    const isOverdue = route.params.isOverdue;
    let room = route.params.room;
    const [comment, setComment] = useState(escapeBR(room.comment));
    const [checkComment, setCheckComment] = useState('');
    const form = route.params.form;
    const sendForm = () => route.params.sendForm();
    const [forceUpdateCounter, setForceUpdateCounter] = useState(0);

    
    const forceUpdate = () => {
        setForceUpdateCounter(forceUpdateCounter+1);
    }

    const onEndEditingComment = () => {
        room.comment = comment.trim().replace(/\n/g, "\\n");
        sendForm()
    }

    // Dialog
    const [checkedSectionId, setCheckedSectionId] = useState();
    const [roomsDialogIsVisible, setRoomsDialogIsVisible] = useState(false);
    const toggleRoomsDialogIsVisible = () => {
      setRoomsDialogIsVisible(!roomsDialogIsVisible)
    };
    const addSection = (checkedSectionId, form, room) => {
        const section = JSON.parse(JSON.stringify( form.nested_templates.find( ({id}) => id == checkedSectionId) ));
        section.templateId = section.id;
        section.id = '' + section.templateId + rand5digits();

        section.nested.push( ...form.nested_templates.filter( ({parent}) => parent == checkedSectionId) );
        room.nested.push( JSON.parse(JSON.stringify(section)) );
        return room;
    }
    

    // Dialog Room Edit
    const [editRoomName, setEditRoomName] = useState('');
    const [roomEditDialogIsVisible, setRoomEditDialogIsVisible] = useState(false);
    const toggleRoomEditDialogIsVisible = () => {
      setRoomEditDialogIsVisible(!roomEditDialogIsVisible);
    };
    const onEndRoomEdit = () => {
        room.name = editRoomName;
        sendForm(); 
        forceUpdate();
      }
    
    
    // Dialog Section Edit
    const [editSection, setEditSection] = useState('');
    const [editSectionName, setEditSectionName] = useState('');
    const [sectionEditDialogIsVisible, setSectionEditDialogIsVisible] = useState(false);
    const toggleSectionEditDialogIsVisible = () => {
      setSectionEditDialogIsVisible(!sectionEditDialogIsVisible);
    };
    const onEndSectionEdit = () => {
        editSection.name = editSectionName;
        sendForm(); 
        forceUpdate();
    }
    const deleteSection = (section) => {
        room.nested = room.nested.filter( ({id}) => (id!=section.id) );
        sendForm(); 
        forceUpdate();
    }
    
      
    // Dialog Room Delete
    const [roomDeleteDialogIsVisible, setRoomDeleteDialogIsVisible] = useState(false);
    const toggleRoomDeleteDialogIsVisible = () => {
      setRoomDeleteDialogIsVisible(!roomDeleteDialogIsVisible);
    };
    const deleteRoom = (room) => {
        form.apartment = form.apartment.filter( ({id}) => (id!=room.id) );
        sendForm(); 
        forceUpdate();
    }
    

    // Dialog Check Details
    const [checkDetails, setCheckDetails] = useState({});
    const [checkDetailsDialogIsVisible, setCheckDetailsDialogIsVisible] = useState(false);
    const toggleCheckDetailsDialogIsVisible = () => {
        setCheckDetailsDialogIsVisible(!checkDetailsDialogIsVisible);
    }
    
    // Initial
    useEffect(() => {
        getDeviceId()
        .then(deviceId =>{ 
            setDeviceId(deviceId)
            init(Config.AmplitudeKey, deviceId);
        } )
    }, []); 

    // Configure navbar title and button
    useEffect(() => {
        // track('RoomScreen-View'); 
        navigation.setOptions({
            title: room.name,
            headerRight: () => (
                !isOverdue ? (<Icon 
                    name="more-horizontal" 
                    type="feather" 
                    color={theme.lightColors.primary}
                    onPress={()=>{
                        setEditRoomName( room.name );
                        toggleRoomEditDialogIsVisible()
                    }}
                /> ) : null
            ),
        });
      }, [navigation, room.name]
    )
    
    useEffect(() => { // hack to save changes of comment field in all the cases going to prev screen after edit the field
        navigation.addListener('beforeRemove', () => {
          sendForm()
        });
      }, [navigation]
    );
    
    // Expanding listitems
    const [expanded, setExpanded] = useState( 
        room.nested.reduce( (sum, {id}) => ({ ...sum, [id]: false }) , {} )
     );
    

    const roomSections = room.nested.map( section => {
        const sectionChecks = section.nested.map( check => {
            return (
                <ListItem 
                    key={check.id}
                    onPress={ () => {
                        setCheckDetails(check)
                        setCheckComment(check.comment ? escapeBR(check.comment) : '')
                        toggleCheckDetailsDialogIsVisible()
                    }}
                    containerStyle={ check.value===false ? {backgroundColor: "#FFE4E1"} : {} }
                >
                    <ListItem.Content>
                        <ListItem.Title>&bull; {dictionary[check.id].name}</ListItem.Title>
                        <ListItem.Subtitle>{check.value}</ListItem.Subtitle>
                    </ListItem.Content>
                    
                    {
                        !isOverdue ? (
                            <Switch
                                value={!check.value}
                                onValueChange={() => {
                                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
                                    check.value = !check.value;
                                    sendForm();
                                    forceUpdate();
                                }}
                                color="#900603"
                            />
                        ) : null
                    }
                    
                </ListItem>
            )
        })

        const falseCheckCount = section.nested.reduce( (sum, cur) => ( sum + ( !cur.value ? 1 : 0) ), 0 );
        const badgeUI = falseCheckCount ? <Badge value={falseCheckCount} status="error"/> : '';
        return (
            <>
                <ListItem.Accordion
                    key={section.id}
                    content={
                        <>
                            <ListItem.Content>
                                <ListItem.Title h4={true}>{section.name ? section.name : dictionary[section.templateId].name} {badgeUI}</ListItem.Title>
                                <ListItem.Subtitle>{inclineWord(section.nested.length, "проверка")} </ListItem.Subtitle>
                            </ListItem.Content>
                            {
                                !isOverdue ? (
                                    <Icon 
                                        name="more-horizontal" 
                                        type="feather" 
                                        color={theme.lightColors.grey4}
                                        onPress={()=>{
                                            setEditSection( section );
                                            setEditSectionName( section.name ? section.name : dictionary[section.templateId].name );
                                            toggleSectionEditDialogIsVisible()
                                        }}
                                    />
                                ) : null 
                                }
                        </>
                    }
                    isExpanded={expanded[section.id]}
                    onPress={() => {
                        setExpanded((expanded)=>({...expanded, [section.id]: !expanded[section.id]}));
                    }}
                >
                    {sectionChecks}
                </ListItem.Accordion>
                <Divider width={10} style={{ opacity: 0 }} />
            </>
        )
    })

//hack

    const [isScrollEnabled, setIsScrollEnabled] = useState(true); 
  
  function onKeyboardWillShow() {
    setIsScrollEnabled(false);
  }

  function onKeyboardDidShow() {
    setIsScrollEnabled(true);
  }

  useEffect(() => {
    const subKWS = Keyboard.addListener("keyboardWillShow", onKeyboardWillShow);
    const subKDS = Keyboard.addListener("keyboardDidShow", onKeyboardDidShow);

    return () => {
      subKWS.remove();
      subKDS.remove();
    };
  }, []);

    const height = useHeaderHeight()

    return (
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                keyboardVerticalOffset={height + 47}
                style={styles.container}
            >
                <ScrollView>
                    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                        <ThemeProvider theme={theme} >
                            <View
                                style={styles.inner}
                            >
                                <View>
                                    {roomSections}

                                    <View key="add">
                                        <Button
                                            type="clear"
                                            onPress={() => {
                                                // track('RoomScreen-AddChecks-Press');
                                                toggleRoomsDialogIsVisible()
                                            }}
                                        >
                                            <Icon type='ionicon' name="add-circle-outline" color={theme.lightColors.primary} /> Добавить набор проверок
                                        </Button>
                                        <Divider width={10} style={{ opacity: 0 }} />
                                    </View>


                                    <TextInput
                                        scrollEnabled={isScrollEnabled}
                                        key="comment"
                                        multiline={true}
                                        numberOfLines={4}
                                        placeholder="Общие недостатки помещения (вводите с переносом строк для нумерации в акте/заключении)"
                                        maxLength={1000}
                                        onChangeText={(text) => {
                                            setComment(text)
                                            room.comment = escapeN(text.trim());
                                        }}
                                        value={comment}
                                        style={{ 
                                            padding: 15, 
                                            height: 150,
                                            backgroundColor: 'white', 
                                            borderWidth: 1, 
                                            borderColor: theme.lightColors.grey4, 
                                            fontSize: 18,
                                            textAlignVertical: 'top',
                                            marginBottom: 20
                                        }}
                                    />


                                    <Dialog key='addChecks'
                                        isVisible={roomsDialogIsVisible}
                                        onBackdropPress={toggleRoomsDialogIsVisible}
                                    >
                                        <Dialog.Title title="Что будем проверять в этой комнате?" />
                                        <ScrollView style={{ height: "70%" }}>
                                            {form?.nested_templates.filter(item => (item.type == 'section')).map((section, i) => (
                                                <CheckBox
                                                    key={i}
                                                    title={dictionary[section.id].name}
                                                    checkedIcon="dot-circle-o"
                                                    uncheckedIcon="circle-o"
                                                    checked={checkedSectionId === section.id}
                                                    onPress={() => setCheckedSectionId(section.id)}
                                                    containerStyle={{
                                                        backgroundColor: 'white',
                                                        borderWidth: 0
                                                    }}
                                                />
                                            ))}
                                        </ScrollView>
                                        <Dialog.Actions>
                                            <Dialog.Button
                                                title="Добавить"
                                                onPress={() => {
                                                    // track('RoomScreen-AddChecks-DialogChecksChoise-Press', { checkedSectionId });
                                                    room = addSection(checkedSectionId, form, room);
                                                    sendForm();
                                                    toggleRoomsDialogIsVisible();
                                                }}
                                            />
                                            <Dialog.Button title="Отмена" onPress={toggleRoomsDialogIsVisible} />
                                        </Dialog.Actions>
                                    </Dialog>


                                    <Dialog key='editRoom'
                                        isVisible={roomEditDialogIsVisible}
                                        onBackdropPress={toggleRoomEditDialogIsVisible}
                                    >
                                        <Dialog.Title title="Название комнаты" />
                                        <TextInput
                                            style={{
                                                height: 40,
                                                backgroundColor: "#FFFFFF",
                                                borderColor: "#AAA",
                                                borderWidth: 1,
                                                padding: 10,
                                            }}
                                            onChangeText={setEditRoomName}
                                            value={editRoomName}
                                            placeholder="Введите название комнаты"
                                        />
                                        <Dialog.Actions>
                                            <Dialog.Button
                                                title="Сохранить"
                                                onPress={() => {
                                                    onEndRoomEdit();
                                                    toggleRoomEditDialogIsVisible();
                                                }}
                                            />
                                            <Dialog.Button
                                                titleStyle={{ color: "red" }}
                                                title="Удалить комнату"
                                                onPress={() => {
                                                    toggleRoomEditDialogIsVisible();
                                                    toggleRoomDeleteDialogIsVisible();
                                                }}
                                            />
                                        </Dialog.Actions>
                                    </Dialog>


                                    <Dialog key='editSection'
                                        isVisible={sectionEditDialogIsVisible}
                                        onBackdropPress={toggleSectionEditDialogIsVisible}
                                    >
                                        <Dialog.Title title="Название проверок" />
                                        <TextInput
                                            style={{
                                                height: 40,
                                                backgroundColor: "#FFFFFF",
                                                borderColor: "#AAA",
                                                borderWidth: 1,
                                                padding: 10,
                                            }}
                                            onChangeText={setEditSectionName}
                                            value={editSectionName}
                                            placeholder="Введите название проверок"
                                        />
                                        <Dialog.Actions>
                                            <Dialog.Button
                                                title="Сохранить"
                                                onPress={() => {
                                                    onEndSectionEdit();
                                                    toggleSectionEditDialogIsVisible();
                                                }}
                                            />
                                            <Dialog.Button
                                                titleStyle={{ color: "red" }}
                                                title="Удалить проверки"
                                                onPress={() => {
                                                    deleteSection(editSection);
                                                    toggleSectionEditDialogIsVisible();
                                                }}
                                            />
                                        </Dialog.Actions>
                                    </Dialog>


                                    <Dialog key='confirmDelete'
                                        isVisible={roomDeleteDialogIsVisible}
                                        onBackdropPress={toggleRoomDeleteDialogIsVisible}
                                    >
                                        <Dialog.Title title="Точно удалить?" />
                                        <Text>
                                            Удалить комнату и все выбранные для неё проверки и выявленные недостатки? Данное действие необратимо.
                                        </Text>
                                        <Dialog.Actions>
                                            <Dialog.Button
                                                title="Отменить"
                                                onPress={toggleRoomDeleteDialogIsVisible}
                                            />
                                            <Dialog.Button
                                                titleStyle={{ color: "red" }}
                                                title="Да, удалить"
                                                onPress={() => {
                                                    deleteRoom(room);
                                                    navigation.goBack();
                                                }}
                                            />
                                        </Dialog.Actions>
                                    </Dialog>


                                    <Dialog key='checkDetail'
                                        isVisible={checkDetailsDialogIsVisible}
                                        onBackdropPress={toggleCheckDetailsDialogIsVisible}
                                    >
                                        <Dialog.Title title={dictionary[checkDetails.id]?.name} />
                                        <Text>{dictionary[checkDetails.id]?.report}</Text>
                                        <Divider />
                                        <View>
                                            <ListItem key="checkD">
                                                <ListItem.Content>
                                                    <ListItem.Title>Есть недостаток</ListItem.Title>
                                                </ListItem.Content>
                                                <Switch
                                                    value={!checkDetails.value}
                                                    onValueChange={() => {
                                                        checkDetails.value = !checkDetails.value;
                                                        sendForm();
                                                        forceUpdate();
                                                    }}
                                                    color="#900603"
                                                />
                                            </ListItem>
                                            <TextInput
                                                scrollEnabled={isScrollEnabled}
                                                key="checkComment"
                                                multiline={true}
                                                numberOfLines={2}
                                                placeholder="Примечание"
                                                maxLength={100}
                                                onChangeText={(text) => setCheckComment( text) }
                                                onEndEditing={() => {
                                                    checkDetails.comment = escapeN( checkComment.trim() );
                                                    checkDetails.value = false;
                                                    sendForm();
                                                    forceUpdate();
                                                }}
                                                value={ checkComment }
                                                style={{ 
                                                    padding: 15, 
                                                    height: 70, 
                                                    backgroundColor: 'white', 
                                                    borderWidth: 1, 
                                                    borderColor: theme.lightColors.grey4, 
                                                    fontSize: 18,
                                                    textAlignVertical: 'top'
                                                }}
                                            />
                                        </View>
                                    </Dialog>
                                </View>
                            </View>
                        </ThemeProvider>
                    </TouchableWithoutFeedback>
                </ScrollView>
            </KeyboardAvoidingView>
    )
    
  };

  const styles = StyleSheet.create({
    mb10: {
      marginBottom: 10,
    },
    ml10: {
      paddingLeft: 20,
    },
    container: {
      flex: 1,
    },
    inner: {
      padding: 20,
      flex: 1,
      justifyContent: 'space-around',
    },
    textInput: {
        height: 40,
        borderBottomColor: theme.lightColors.grey4,
        borderBottomWidth: 2,
        fontSize: 19,
        padding: 2,
        marginRight: 10,
        width: 255
    }
  });