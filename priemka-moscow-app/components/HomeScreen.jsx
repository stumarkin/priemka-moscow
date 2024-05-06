
/**
 * @author Sergey Tumarkin https://tumarkin.me
 */
import { useState, useEffect, useCallback } from 'react';
import { BannerView, BannerNeedUpdate } from './BannerView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { 
    Alert,
    View, 
    Platform,
    ScrollView, 
    RefreshControl
} from 'react-native';
import { 
    ThemeProvider, 
    Text, 
    Button, 
    CheckBox,
    ListItem,
    Switch,
    Dialog,
    Divider,
    Skeleton,
    Input,
    Icon
} from '@rneui/themed';
import { theme } from './theme';
import * as API from '../data/API';
import * as Config from '../data/Config';
import * as SecureStore from 'expo-secure-store';
import * as Application from 'expo-application';
import InstaStory from 'react-native-insta-story';

import * as Amplitude from '@amplitude/analytics-react-native';
const AmplitudeTrack = (name,obj) => Amplitude.track(name,obj)

const inclineWord = ( howMany, ofWhat, humanicStyle = false ) => {
    switch (ofWhat){
        case "недостаток":
            if ([10,11,12,13,14].includes(parseInt(howMany))){
                return `${howMany} недостатков`;
            }
            switch ( howMany - (Math.floor(howMany/10)*10) ){
                case 0: if (humanicStyle) {return `пока не нашли недостатков`}
                case 1: return `${howMany} недостаток`
                case 2:
                case 3:
                case 4: return `${howMany} недостатка`
                default: return `${howMany} недостатков`
            }
        
        case "проверка":
            if ([11,12,13,14].includes(parseInt(howMany))){
                return `${howMany} проверок`;
            }
            switch ( howMany - (Math.floor(howMany/10)*10) ){
                case 1: return `${howMany} проверка`
                case 2:
                case 3:
                case 4: return `${howMany} проверки`
                default: return `${howMany} проверок`
            }

        case "приёмка":
            if ([11,12,13,14].includes(parseInt(howMany))){
                return `${howMany} приёмок`;
            }
            switch ( howMany - (Math.floor(howMany/10)*10) ){
                case 1: return `${howMany} приёмка`
                case 2:
                case 3:
                case 4: return `${howMany} приёмки`
                default: return `${howMany} приёмок`
            }
        case "день":
            if ([11,12,13,14].includes(parseInt(howMany))){
                return `${howMany} дней`;
            }
            switch ( howMany - (Math.floor(howMany/10)*10) ){
                case 1: return `${howMany} день`
                case 2:
                case 3:
                case 4: return `${howMany} дня`
                default: return `${howMany} дней`
            }
        case "минута":
            if ([11,12,13,14].includes(parseInt(howMany))){
                return `${howMany} минут`;
            }
            switch ( howMany - (Math.floor(howMany/10)*10) ){
                case 1: return `${howMany} минута`
                case 2:
                case 3:
                case 4: return `${howMany} минуты`
                default: return `${howMany} минут`
            }
        case "час":
            if ([11,12,13,14].includes(howMany)){
                return `${howMany} часов`;
            }
            switch ( howMany - (Math.floor(howMany/10)*10) ){
                case 1: return `${howMany} час`
                case 2:
                case 3:
                case 4: return `${howMany} часа`
                default: return `${howMany} часов`
            }
        default: return `${howMany} ${ofWhat}`
    }
}

const  generateId = (length) => {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let i = 0;
    while (i < length) {
        i += 1;
        result += i%5 ? [...characters][Math.floor(Math.random() * characters.length)] : '-';
    }
    return result;
}

const getDeviceId = async () => {
    let deviceId = await SecureStore.getItemAsync('deviceId');
    if (!deviceId) {
        deviceId = generateId(19);
        await SecureStore.setItemAsync('deviceId', deviceId);
    }
    return deviceId;
}

const getTimeElapsed = ( timestamp ) => {
    const millis = Date.now() - timestamp;
    const secondsElapsed = Math.floor(millis / 1000);
    if (secondsElapsed < 60) {
        return 'только что '
    } else if (secondsElapsed < 60 * 60) {
        return inclineWord(Math.floor(secondsElapsed / 60), 'минута') + ' назад'
    } else if (secondsElapsed < (60 * 60 * 24)) {
        return inclineWord(Math.floor(secondsElapsed / (60 * 60)), 'час') + ' назад'
    } else {
        return inclineWord(Math.floor(secondsElapsed / (60 * 60 * 24)), 'день') + ' назад'
    }
}



export default function HomeScreen ({navigation, route}) {
    const { 
        authtoken,
        username,
        appIsOffline
     } = route.params;
    const setAuthtoken = ( val ) => route.params.setAuthtoken( val );
    
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [isFormsUpdating, setIsFormsUpdating] = useState(false);
    const [refreshing, setRefreshing] = useState(false);
    
    const [formIsOffline, setFormIsOffline] = useState(appIsOffline);
    
    const [template, setTemplate] = useState( {} );
    const [designTypes, setDesignTypes] = useState( [] );
    const [designTypeSelected, setDesignTypeSelected] = useState( 0 );
    
    const [onlineForms, setOnlineForms] = useState([]);
    const [offlineForms, setOfflineForms] = useState([]);
    
    const [banners, setBanners] = useState([]);
    const [stories, setStories] = useState([]);
    const [deviceId, setDeviceId] = useState(null)
    
    const [appUpdateUrl, setAppUpdateUrl] = useState('')
    const [counter, setCounter] = useState( 0 )
    
    const [name, setName] = useState('Приёмка Про')
    const [plan, setPlan] = useState(null)
    
    const [featuretoggles, setFeaturetoggles] = useState({ 
        offline: false,
        photo: false
    })

    const onRefresh = useCallback(() => {
        setRefreshing(true)
        getForms()
        getStories()
    }, []);

    const getForms = () => {

        //offline forms
        AsyncStorage.getAllKeys()
        .then( keys => {
            AsyncStorage.multiGet( keys.filter( filter => filter.indexOf('form_')==0 ))
            .then( entries => {
                let forms = entries.map(([id, form_json]) => {
                    let {address, apartmentNum, isOffline} = JSON.parse(form_json)
                    return {id, address, apartmentNum, isOffline: true}
                })
                setOfflineForms( forms )
            })
        })

        //online forms
        if (!appIsOffline){
            setIsFormsUpdating(true)

            API.Get({ method:'getforms', authtoken })
            .then(res => {
                if (res.data.result === true ){
                    setOnlineForms( res.data.forms );
                } else {
                    setOnlineForms( [] );
                    console.log( 'getforms result false. API response:\n' + JSON.stringify(res.data) ) 
                }
            })
            .finally(()=>{
                setRefreshing(false);
                setIsInitialLoading(false)
                setIsFormsUpdating(false)
            })
        } else {
            setIsInitialLoading(false)
        }
    }

    // Dialog Apartment Address
    const [apartmentAddressDialogIsVisible, setApartmentAddressDialogIsVisible] = useState(false);
    const toggleApartmentAddressDialogIsVisible = () => {
        setApartmentAddressDialogIsVisible(!apartmentAddressDialogIsVisible);
    };
    const [address, setAddress] = useState('');
    const [apartmentNum, setApartmentNum] = useState('');
    const [customer, setCustomer] = useState('');
    
    // Dialog Account Exit 
    const [accountExitDialogIsVisible, setAccountExitDialogIsVisible] = useState(false);
    const toggleAccountExitDialogIsVisible = () => {
        setAccountExitDialogIsVisible(!accountExitDialogIsVisible);
    };    
    
    const updateLocalTemplate = ( localversion = 0 ) => {
        API.Get({ method:'gettemplate', localversion, authtoken })
        .then(({data}) => {
            const {result, needtoupdate, template } = data
            if ( needtoupdate === true ){
                template.timestamp = Date.now()
                setTemplate( template ) 
                AsyncStorage.setItem( "template", JSON.stringify(template) )
            } else {
                // console.log( 'gettemplate result false. API response:\n' + JSON.stringify(res.data) ) 
            }
        })
        .catch( err => {
            console.log( 'gettemplate error. \n' + JSON.stringify(err) ) 
        })
    }

    const getBanners = () => {
        API.Get({ method:'getbanners', authtoken})
        .then(({data}) => {
            const {result, banners} = data
            if (result && banners){
                setBanners( banners );
            } else {
                Alert.alert('Ошибка загрузки данных', 'getbanners')
                console.log( 'Banner load fail. API response:\n' + JSON.stringify(res.data) ) 
            }
        })
    }

    const getStories = () => {
        API.Get({ method:'getstories', authtoken})
        .then(({data}) => {
            console.log(data)
            const {result, stories} = data
            if (result && stories){
                setStories( stories );
            } else {
                Alert.alert('Ошибка загрузки данных', 'getstories')
                console.log( 'stories load fail. API response:\n' + JSON.stringify(res.data) ) 
            }
        })
    }

    // Initial
    useEffect(() => {
        getDeviceId()
        .then(deviceid =>{ 
            setDeviceId(deviceid)

            if (appIsOffline){
                // local featuretoggles
                AsyncStorage.getItem('featuretoggles')
                .then( featuretoggles_json => {
                    setFeaturetoggles( featuretoggles_json ? JSON.parse(featuretoggles_json) : Config.FeatureToggles );
                })
                // local saved plan
                AsyncStorage.getItem('plan')
                .then( plan_json => {
                    setPlan( JSON.parse(plan_json) );
                })
            } else {
                // config
                API.Get({ method:'getconfig', authtoken, deviceid, platform: Platform.OS, appversion: Application.nativeApplicationVersion })
                .then( ({data}) => {
                    console.log( data ) 
                    const {designtypes, appupdateurl, featuretoggles} = data
                    setDesignTypes( designtypes )
                    setAppUpdateUrl( appupdateurl );
                    setFeaturetoggles( featuretoggles );
                    AsyncStorage.setItem( "featuretoggles", JSON.stringify(featuretoggles) )
                })
                .catch( err => {
                    Alert.alert('Ошибка загрузки данных', err)
                })
                
                //plan
                API.Get({ method:'getaccountplan', authtoken })
                .then(({data}) => {
                    console.log( data ) 
                    const {result, plan} = data
                    if (result){
                        setPlan(plan)
                    }
                    AsyncStorage.setItem( "plan", JSON.stringify(plan) )
                })
                .catch( err => {
                    Alert.alert('Ошибка загрузки данных', err)
                    console.log( 'getaccountplan error. \n' + JSON.stringify(err) ) 
                })

                getBanners()
                getStories()
    
                Amplitude.init( Config.AmplitudeKey, username, {
                    deviceId: deviceid,
                    appVersion: Application.nativeApplicationVersion,
                    platform: 'Mobile'
                });
                
                AmplitudeTrack('App-HomeScreen-View');
            }
            

            // template (from local storage and check/update it from API)
            // AsyncStorage.removeItem('template')
            AsyncStorage.getItem('template')
            .then( template_json => {
                const template = JSON.parse( template_json )
                setTemplate( template ) 
                if (!appIsOffline){
                    updateLocalTemplate( template?.version  )
                }
            })
        } )
    }, []); 

    useFocusEffect(
        useCallback(() => {
            getForms()
        }, [])
    );


    // Banners with sections sorting
    const bannersUI = {}
    const bannerSections = banners?.map(({section})=>(section)).filter( (item, i, arr) => arr.indexOf(item) === i );
    bannerSections?.forEach( section_ => {bannersUI[section_] = banners.filter( ({section}) => section == section_ ).map( (banner, key) => (
        <BannerView {...banner} key={key} onPress={() =>{
            AmplitudeTrack('App-HomeScreen-Banner-Press', {banner: banner.header }); 
            navigation.navigate('Webview', {title: '', deviceid: deviceId, callback: ()=>{setCounter(counter+1)}, url: banner.webviewUrl + (banner.webviewUrl.indexOf('?')>-1 ? '&' : '?') + 'deviceid=' + deviceId })
         }}/>
    ))} )

    return (
        <ScrollView 
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh}/>}
        >    
            <View style={{ padding: 20, paddingTop: 100}}>
                <ThemeProvider theme={theme}>
                    <View
                        key={'header'}
                        style={{
                            justifyContent: 'space-between', 
                            flexDirection: 'row'
                        }}
                    >
                        <Text style={{fontSize: 36, fontWeight: 700, marginBottom: 20}}>{plan?.accountname}</Text>
                    </View>
                    
                    {
                        isInitialLoading ? (
                            <>
                                <Skeleton key={0} animation="pulse" height={150} style={{borderRadius: 10}}/>
                                <Divider  key={1} width={10} style={{ opacity: 0 }} />
                                <Skeleton key={2} animation="pulse" height={150} />
                                <Divider  key={3} width={10} style={{ opacity: 0 }} />
                                <Skeleton key={4} animation="pulse" height={370} />
                            </>
                        ) : (
                            <>
            
                                { appIsOffline && <BannerView 
                                                    key={'offline'} 
                                                    header={
                                                        <>
                                                            <Icon type='material-community' name="signal-off" color={'white'} /> Отсутствует интернет
                                                        </>
                                                    } 
                                                    text='Доступна приёмка оффлайн' 
                                                    backgroundColor="#b6737c" 
                                                    textColor="#fff"
                                                />
                                }

                                {
                                    stories.length > 0 &&
                                    <InstaStory
                                        data={stories}
                                        style={{marginBottom:10}}
                                        storyAvatarImageStyle={{display:'none'}}
                                        duration={10}
                                        avatarSize={90}
                                        avatarImageStyle={{borderRadius:5}}
                                        avatarWrapperStyle={{marginVertical:10,margin:0}}
                                        avatarTextStyle={{fontSize:14}}
                                        unPressedBorderColor={'#eee'}
                                        pressedBorderColor={'#eee'}
                                    />
                                }

                                { plan?.days_left<4 && <BannerView 
                                                    key={'paymentRequired'} 
                                                    header={
                                                        <>
                                                            <Icon type='material-community' name="clock-alert-outline" color={'white'} /> {(plan?.id>1 ? "Требуется оплата": "Демо-режим")}
                                                        </>
                                                    } 
                                                    text={ plan?.days_left<0 ? 'Оплаченный период завершился' : `До конца оплаченного периода - ${plan?.days_left} дн` }
                                                    backgroundColor={ plan?.days_left<0 ? "red" : "#f14908" } 
                                                    textColor="#fff"
                                                />
                                }

                                { 
                                    appUpdateUrl ? (
                                        <BannerNeedUpdate key={'needupdate'}  appUpdateUrl={appUpdateUrl} track={AmplitudeTrack}/> 
                                    ) : null
                                }

                                { bannersUI.top }

                                <BannerView 
                                    key={'new'}
                                    header='Новая приёмка'
                                    text= { plan?.days_left<0 ? 'Оплатите тариф для новых приёмок' : 'Сегодня всё получится. Вас не остановить!' }
                                    button={ <Button
                                                title='Начать приёмку' 
                                                onPress={() =>{
                                                    AmplitudeTrack('App-HomeScreen-NewAcceptance-Press' );
                                                    toggleApartmentAddressDialogIsVisible();
                                                }}
                                                disabled={plan?.days_left<0}
                                            />
                                    }
                                />               
                                
                                <BannerView 
                                    key={'prev'}
                                    header='Предыдущие приёмки'
                                    text= { onlineForms.length==0 ? 'Здесь появятся все ваши приемки. Указывайте адрес приёмки для удобного поиска в общем списке' : null }
                                    actionControls={
                                        [...offlineForms, ...onlineForms].map( form => {
                                            return (
                                                    <ListItem 
                                                        key={form.id} 
                                                        containerStyle={{paddingHorizontal: 0}}
                                                        onPress={ () =>{ 
                                                            AmplitudeTrack('App-HomeScreen-PrevAcceptance-Press');
                                                            navigation.navigate('Apartment', { AmplitudeTrack, appIsOffline, template, authtoken, featuretoggles, plan, formId: form.id, formIsOffline: form.isOffline, getForms }) 
                                                        }}
                                                        disabled={isFormsUpdating}
                                                        disabledStyle={{opacity: 0.5}}
                                                    >
                                                        <ListItem.Content>
                                                            <ListItem.Title style={{fontWeight: 600}}>{form.address ? `${form.address} ${form.apartmentNum}` : 'Без адреса'}</ListItem.Title>
                                                            {form.isOffline ? (
                                                                <ListItem.Subtitle style={{fontSize: 14, color: '#b6737c'}}>оффлайн</ListItem.Subtitle>
                                                            ) : (
                                                                <ListItem.Subtitle style={{fontSize: 14}}>{inclineWord(form.failChecksCountTotal, "недостаток", true)}{ form.timestamp ? `, ${getTimeElapsed(Date.parse(form.timestamp))}` : null}</ListItem.Subtitle>
                                                            )}
                                                        </ListItem.Content>
                                                        <ListItem.Chevron />
                                                    </ListItem>
                                            )
                                        })
                                    }
                                />             

                                {bannersUI.bottom}
                                
                                <Button 
                                    key='exitButton'
                                    title="Профиль"
                                    type="clear"
                                    titleStyle={{ color: "grey"}}
                                    onPress={toggleAccountExitDialogIsVisible}
                                    style={{marginBottom:10}}
                                />
                            </>
                        )
                    }
                    
                    <Dialog
                        key={'apartmentAddress'}
                        isVisible={apartmentAddressDialogIsVisible}
                        onBackdropPress={toggleApartmentAddressDialogIsVisible}
                        overlayStyle={ {marginTop:-150} }
                    >
                        <Text style={{fontSize: 22, fontWeight: 700}}>
                            Новая приёмка
                        </Text>
                        
                        <View>
                            <Input
                                onChangeText={ setCustomer }
                                value={ customer }
                                placeholder="ФИО заказчика"
                            />
                            <Input
                                onChangeText={ setAddress }
                                value={address}
                                placeholder="Город, улица, дом, корпус"
                            />
                            <Input
                                inputContainerStyle={{
                                    // width: '20%',
                                }}
                                onChangeText={ setApartmentNum }
                                value={ apartmentNum }
                                placeholder="№ кв"
                            />
                            <View style={{ marginLeft: 0}}>
                                {designTypes.map((designType, i) => (
                                    <CheckBox
                                        key={i}
                                        title={designType}
                                        checkedIcon="dot-circle-o"
                                        uncheckedIcon="circle-o"
                                        checked={designTypeSelected == i}
                                        onPress={() => setDesignTypeSelected(i)}
                                        containerStyle={{ 
                                            backgroundColor: 'white', 
                                            borderWidth: 0,
                                            marginBottom: 5,
                                            padding: 0
                                        }}
                                    />
                                ))}
                            </View>

                            {
                                featuretoggles?.offline && !!+plan?.feature_offline && 
                                <>
                                    <Divider width={1} style={{marginHorizontal:5, marginTop: 30}} color="grey" />

                                    <View style={{ marginLeft: 0}}>
                                        <ListItem key="formIsOffline">
                                            <ListItem.Content>
                                                <ListItem.Title>Oффлайн</ListItem.Title>
                                            </ListItem.Content>
                                            <Switch
                                                value={ formIsOffline }
                                                onValueChange={() => {
                                                    setFormIsOffline( !formIsOffline )
                                                }}
                                                color="#b6737c"
                                                disabled={appIsOffline}
                                            />
                                        </ListItem>
                                    </View>
                                </>
                            }
                        </View>

                        <Dialog.Actions>
                                <Button 
                                    title="Далее"
                                    containerStyle={{
                                        width: '100%'
                                    }}
                                    onPress={ ()=>{
                                        AmplitudeTrack('App-HomeScreen-NewAcceptance-Address-Press', { address } );
                                        toggleApartmentAddressDialogIsVisible();
                                        navigation.navigate('Apartment', { AmplitudeTrack, appIsOffline, template, authtoken, featuretoggles, plan, formId: null, formIsOffline, address, apartmentNum, customer, designTypeSelected, designTypes, getForms });
                                        setApartmentNum('')
                                        setAddress('')
                                        setCustomer('')
                                    }} 
                                />
                        </Dialog.Actions>
                    </Dialog>

                    <Dialog
                        key={'accountExitDialog'}
                        isVisible={accountExitDialogIsVisible}
                        onBackdropPress={toggleAccountExitDialogIsVisible}
                    >
                        <Text style={{fontSize: 22, fontWeight: 700}}>Профиль</Text>
                        <View>
                            <Text>{Application.applicationName} {Application.nativeApplicationVersion}</Text>
                            <Text>User {username}</Text>
                            <Text>Auth {authtoken}</Text>
                            <Text>Device {deviceId}</Text>
                            <Text>Template v{ template?.version }, {template?.timestamp ? new Date(template.timestamp).toISOString().slice(0, 19).replace('T', ' ') : ''}</Text>
                            {/* <Text>Тариф: "{plan?.name}" оплачен еще {plan?.days_left} дн</Text> */}
                        </View>
                        <Dialog.Actions>
                            <Button 
                                title={`Выйти`}
                                onPress={ ()=>{
                                    AmplitudeTrack('App-HomeScreen-NewAcceptance-Address-Press', { address } );
                                    AsyncStorage.setItem( "authtoken", '' )
                                    setAuthtoken(false)
                                    // navigation.goBack()
                                    // navigation.navigate('SignIn', {  }) 

                                    toggleAccountExitDialogIsVisible();
                                }}
                                containerStyle={{width: '100%'}} 
                            />
                        </Dialog.Actions>
                    </Dialog>

                    <StatusBar style="auto" />
                </ThemeProvider>
            </View>
        </ScrollView>
    );
  };