import { useState, useEffect } from 'react';
import { 
    ScrollView, 
    StyleSheet, 
    TextInput,
    View,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    Keyboard,
    Image
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
    Skeleton
} from '@rneui/themed';
import {BannerView} from './BannerView';
import { theme } from './theme';
import * as Haptics from 'expo-haptics';
import * as Config from '../data/Config';
import { useHeaderHeight } from '@react-navigation/elements'
import * as ImagePicker from 'expo-image-picker';
import * as API from '../data/API';





const escapeN = (str) => {
    return str.replace( /\n/g, "<br>")
}

const escapeBR = (str) => {
    return str.replace( /<br>/g, "\n")
}


export default function RoomScreen ({navigation, route}) {
    let {
        check,
        form, 
        dictionary, 
        authtoken,
        featuretoggles,
        plan,
        formIsOffline
    } = route.params;

    const saveForm = () => route.params.saveForm()
    const forceUpdate = () => route.params.forceUpdate()
    const AmplitudeTrack = (event, obj) => route.params.AmplitudeTrack(event, obj)

    const [checkValue, setCheckValue] = useState(check.value);
    const [checkImage, setCheckImage] = useState( check.image || null);
    const [checkComment, setCheckComment] = useState( check.comment ? escapeBR(check.comment) : '' )
    const [formImagesCount, setFormImagesCount] = useState(0);
    
    const [isSendingPhoto, setIsSendingPhoto] = useState(false);
    


    // Configure navbar title and button
    useEffect(() => {
        AmplitudeTrack('App-CheckScreen-View');  
       
      }, []
    )

    useEffect(() => { // hack to save changes of comment field in all the cases going to prev screen after edit the field
        navigation.addListener('beforeRemove', ()=>{
            check.value = checkValue
            if (checkComment.trim().length>0 || check.comment){
                check.comment = checkComment
            }
            if (checkImage){
                check.image = checkImage
            } else if (check.image) {
                delete check.image
            }
            saveForm() 
            forceUpdate()
            });
      }, [navigation, checkValue, checkComment, checkImage]
    );
    
    

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

    const pickImage = async () => {
        // No permissions request is necessary for launching the image library
        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.All,
            allowsEditing: true,
            //   aspect: [4, 3],
            quality: 0.2 ,
        });

        console.log(result);

        if (!result.canceled) {
            // uploadFile
            uploadFile(result.assets[0].uri);
        }
    };

    const uploadFile = async ( imageUri ) => {
        // console.log('uploadFile: ' + imageUri );
        if (imageUri != null) {
            const formData = new FormData();
            formData.append('formid', form.id)
            formData.append('file', {
              uri: imageUri,
              type: 'image/jpeg',
              name: imageUri.split('/').pop(),
            });
            
            setIsSendingPhoto(true)

            API.Post({ method:'uploadformfile', authtoken }, formData)
            .then(({data}) => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    
                if ( data.result === true ){
                    setCheckImage( data.uri )
                    // navigation.goBack()
                } else {
                    Alert.alert('❌\nНе загрузилось', 'Проверьте подключение к интернету и попробуйте еще раз')
                }
            })
            .catch((err)=>{
                console.log(err);
            })
            .finally(()=>{
                setIsSendingPhoto(false)
                setCheckValue(false)
                FileSystem.deleteAsync(imageUri)
            })

        } else {
            console.log('uploadFile error: file not selected');
        }
    };

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
                                    <BannerView 
                                        key={'name'} 
                                        header={dictionary[check.id]?.name} 
                                        text={dictionary[check.id]?.report}
                                        actionControls={
                                            <ListItem key="checkD" containerStyle={{paddingHorizontal:0}}>
                                                <ListItem.Content>
                                                    <ListItem.Title style={{fontSize:20}}>Есть недостаток?</ListItem.Title>
                                                </ListItem.Content>
                                                <Switch
                                                    value={!checkValue}
                                                    onValueChange={() => {
                                                        setCheckValue(!checkValue)
                                                    }}
                                                    color="#900603"
                                                />
                                            </ListItem>
                                        }
                                    />
                                    
                                    <BannerView 
                                        key={'photo'} 
                                        header='Фото' 
                                        button={
                                            <>
                                                { 
                                                    isSendingPhoto && <Skeleton width={'100%'} height={250} style={{marginBottom:10}}/>
                                                }
                                                
                                                { 
                                                    checkImage && 
                                                    <>
                                                        <Image style={{ backgroundColor: 'lightgrey', marginTop: 20, width: '100%', height: 250 }} src={Config.Domain + checkImage} /> 
                                                        <Button
                                                            disabled={!checkImage}
                                                            key='removePhoto'
                                                            type="clear"
                                                            onPress={() => {
                                                                AmplitudeTrack('App-RoomScreen-RemovePhoto-Press');
                                                                // delete check.image 
                                                                setCheckImage(null)
                            
                                                            }}
                                                            titleStyle={{ color: 'red' }}
                                                        >
                                                            Удалить фото
                                                        </Button>
                                                    </>
                                                }
 
                                                {
                                                    featuretoggles.photo && !!+plan?.feature_photo &&
                                                    <>
                                                        <View style={styles.container}>
                                                            <View style={styles.buttonContainer}>
                                                                <Button
                                                                    key='addPhoto'
                                                                    onPress={() => {
                                                                        AmplitudeTrack('App-RoomScreen-AddPhoto-Press');
                                                                        navigation.navigate('Camera', { 
                                                                            AmplitudeTrack,
                                                                            title: '',
                                                                            authtoken,
                                                                            formId: form.id,
                                                                            onGoBack: ( uri ) => { 
                                                                                setCheckValue( false)
                                                                                setCheckImage( uri)
                                                                            },   
                                                                        })
                                                                    }}
                                                                    style={styles.button}
                                                                    disabled={ formImagesCount >= plan?.limit_photo_per_form || formIsOffline }
                                                                >
                                                                    Камера
                                                                </Button> 
                                                            </View>
                                                            <View style={styles.buttonContainer}>
                                                                <Button
                                                                    key='addImage'
                                                                    onPress={pickImage}
                                                                    style={styles.button}
                                                                    disabled={ formImagesCount >= plan?.limit_photo_per_form || formIsOffline }
                                                                >
                                                                Галерея
                                                                </Button> 
                                                            </View>
                                                        </View>
                                                        { formImagesCount >= plan?.limit_photo_per_form && <Text style={{alignSelf:'center'}}>Уже добавлено {formImagesCount} фото. Смените тариф, чтобы загружать больше фото в каждую приёмку</Text>}
                                                        { formIsOffline && <Text style={{alignSelf:'center'}}>В оффлайн режиме добавление фото недоступно</Text>}
                                                    </>
                                                }
                                            </>

                                        }
                                    />

                                    <BannerView 
                                        key={'comment'} 
                                        header='Комментарий'
                                        actionControls={
                                            <>  
                                                <TextInput
                                                    scrollEnabled={isScrollEnabled}
                                                    key="checkComment"
                                                    multiline={true}
                                                    numberOfLines={2}
                                                    placeholder="Добавьте уточнение по недостатку при необходимости"
                                                    maxLength={512}
                                                    // onFocus={() => setIsCheckDialogInputFocused(true) }
                                                    // onBlur={() => setIsCheckDialogInputFocused(false) }
                                                    onChangeText={(text) => setCheckComment( text) }
                                                    onEndEditing={() => {
                                                        setCheckComment( escapeN( checkComment.trim() ))
                                                        setCheckValue( checkValue && checkComment.trim().length==0 )
                                                        saveForm()
                                                        // forceUpdate()
                                                    }}
                                                    value={ checkComment }
                                                    style={{ 
                                                        padding: 15, 
                                                        height: 250, 
                                                        backgroundColor: 'white', 
                                                        borderWidth: 1, 
                                                        borderColor: theme.lightColors.grey4, 
                                                        fontSize: 18,
                                                        textAlignVertical: 'top'
                                                    }}
                                                />
                                            </>
                                        }
                                    />

                                    
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
    },
    container: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 5, 
    },
    buttonContainer: {
        flex: 1,
        marginHorizontal: 2,
      },
  });