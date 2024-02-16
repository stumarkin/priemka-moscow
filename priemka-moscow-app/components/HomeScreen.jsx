
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
    TextInput,
    RefreshControl
} from 'react-native';
import { 
    ThemeProvider, 
    Text, 
    Button, 
    CheckBox,
    Dialog,
    Divider,
    ListItem,
    Skeleton
} from '@rneui/themed';
import { theme } from './theme';
import * as API from '../data/API';
import * as Config from '../data/Config';
import * as SecureStore from 'expo-secure-store';

import { init, track } from '@amplitude/analytics-react-native';

import * as Application from 'expo-application';

const inclineWord = ( howMany, ofWhat, humanicStyle = false ) => {
    switch (ofWhat){
        case "недостаток":
            if ([11,12,13,14].includes(howMany)){
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

        case "приёмка":
            if ([11,12,13,14].includes(howMany)){
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
            if ([11,12,13,14].includes(howMany)){
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
            if ([11,12,13,14].includes(howMany)){
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
    if (secondsElapsed<60) {
        return 'только что '
     } else  if (secondsElapsed<60*60) {
        return inclineWord(Math.floor(secondsElapsed/60), 'минута') + ' назад'
     } else  if (secondsElapsed<(60*60*24)) {
        return inclineWord(Math.floor(secondsElapsed/(60*60)), 'час') + ' назад'
     } else {
        return inclineWord(Math.floor(secondsElapsed/(60*60*24)), 'день') + ' назад'
     }
}



export default function HomeScreen ({navigation, route}) {
    const setIsSignedIn = ( val ) => route.params.setIsSignedIn( val );
    const setUser = ( val ) => route.params.setUser( val );

    const [refreshing, setRefreshing] = useState(false);

    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [previousForms, setPreviousForms] = useState([]);
    const [banners, setBanners] = useState([]);
    const [deviceId, setDeviceId] = useState(null)
    const [ProDaysLeft, setProDaysLeft] = useState( true )
    const [appVersion, setAppVersion] = useState( Application.nativeApplicationVersion )
    const [appPlatform, setAppPlatform] = useState( Platform.OS )
    const [appUpdateUrl, setAppUpdateUrl] = useState('')
    const [counter, setCounter] = useState( 0 )

    const { designTypes, user } = route.params;
    const setSquare = ( val ) => route.params.setSquare( val );
    const setDesignTypeSelected = ( val ) => route.params.setDesignTypeSelected( val );
    const [square, setSquareLocal] = useState( 0 );
    const [designTypeSelected, setDesignTypeSelectedLocal] = useState( 0 );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        getPreviousForms();
    }, []);


    const getPreviousForms = () => {
        API.Get({ method:'getforms', userid: user.id})
        .then(res => {
            if (res.data.result === true ){
                setPreviousForms( res.data.forms );
            } else {
                setPreviousForms( [] );
                console.log( 'getforms result false. API response:\n' + JSON.stringify(res.data) ) 
            }
        })
        .finally(()=>{
            setRefreshing(false);
            setIsInitialLoading(false)

        })
    }

    // Dialog Apartment Address
    const [apartmentAddressDialogIsVisible, setApartmentAddressDialogIsVisible] = useState(false);
    const toggleApartmentAddressDialogIsVisible = () => {
        setApartmentAddressDialogIsVisible(!apartmentAddressDialogIsVisible);
    };
    const [address, setAddress] = useState('');
    const [apartmentNum, setApartmentNum] = useState('');
    const [customer, setCustomer] = useState('');
    
    
    // Dialog Apartment Square
    const [apartmentSquareDialogIsVisible, setApartmentSquareDialogIsVisible] = useState(false);
    const toggleApartmentSquareDialogIsVisible = () => {
        setApartmentSquareDialogIsVisible(!apartmentSquareDialogIsVisible);
    };    
    
    // Dialog Account Exit 
    const [accountExitDialogIsVisible, setAccountExitDialogIsVisible] = useState(false);
    const toggleAccountExitDialogIsVisible = () => {
        setAccountExitDialogIsVisible(!accountExitDialogIsVisible);
    };    
    

    // Initial
    useEffect(() => {
        getDeviceId()
        .then(deviceId =>{ 
            setDeviceId(deviceId)
            init( Config.AmplitudeKey, deviceId);
            // track('HomeScreen-View', {appPlatform, appVersion});
              
        } )
        
        API.Get({ method:'getbanners', platform:appPlatform})
        .then(res => {
            if (res.data.result === true ){
                setBanners( res.data.banners );
            } else {
                console.log( 'Banner load fail. API response:\n' + JSON.stringify(res.data) ) 
            }
        })


        API.Get({ method:'needupdate', platform:appPlatform, appversion:appVersion })
        .then(res => {
            if (res.data.result === true ){
                setAppUpdateUrl( res.data.appupdateurl );
            } else {
                console.log( 'Needupdate load fail. API response:\n' + JSON.stringify(res.data) ) 
            }
        })
    }, []); 

    useFocusEffect(
        useCallback(() => {
            getPreviousForms()
        }, [])
    );
    


    // Banners with sections sorting
    const bannersUI = {}
    const bannerSections = banners?.map(({section})=>(section)).filter( (item, i, arr) => arr.indexOf(item) === i );
    bannerSections?.forEach( section_ => {bannersUI[section_] = banners.filter( ({section}) => section == section_ ).map( (banner, key) => (
        <BannerView {...banner} key={key} onPress={() =>{
            // track('HomeScreen-Banner-Press', {banner: banner.header }); 
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
                        <Text style={{fontSize: 36, fontWeight: 700, marginBottom: 20}}>{Config.CompanyName}</Text>
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
                                { 
                                    appUpdateUrl ? (
                                        <BannerNeedUpdate key={'needupdate'}  appUpdateUrl={appUpdateUrl} track={track}/> 
                                    ) : null
                                }

                                { bannersUI.top }

                                <BannerView 
                                    key={'new'}
                                    header='Новая приёмка'
                                    text= 'Сегодня всё получится. Вас не остановить!' 
                                    button={ <Button
                                                title='Начать приёмку' 
                                                onPress={() =>{
                                                    // track('HomeScreen-NewAcceptance-Press' );
                                                    toggleApartmentAddressDialogIsVisible();
                                                }}
                                            />
                                    }
                                />                
                                
                                <BannerView 
                                    key={'prev'}
                                    header='Предыдущие приёмки'
                                    text= { previousForms.length==0 ? 'Здесь появятся все ваши приемки. Указывайте адрес приёмки для удобного поиска в общем списке' : null }
                                    actionControls={
                                        previousForms.map( value => {
                                            return (
                                                    <ListItem 
                                                        key={value.id} 
                                                        containerStyle={{paddingHorizontal: 0}}
                                                        onPress={ () =>{ 
                                                            // track('HomeScreen-PrevAcceptance-Press');
                                                            navigation.navigate('Apartment', { user, formId: value.id, getPreviousForms, ProDaysLeft }) 
                                                        }}
                                                    >
                                                        <ListItem.Content>
                                                            <ListItem.Title style={{fontWeight: 600}}>{value.address ? value.address : 'Без адреса'}</ListItem.Title>
                                                            <ListItem.Subtitle style={{fontSize: 14}}>{inclineWord(value.failChecksCountTotal, "недостаток", true)}{ value.timestamp ? `, ${getTimeElapsed(Date.parse(value.timestamp))}` : null}</ListItem.Subtitle>
                                                        </ListItem.Content>
                                                        <ListItem.Chevron />
                                                    </ListItem>
                                            )
                                    })}
                                />                

                                {bannersUI.bottom}
                                
                                <Button 
                                    key='exitButton'
                                    title="Выйти"
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
                                onChangeText={ setAddress }
                                value={address}
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
                                onChangeText={ setApartmentNum }
                                value={ apartmentNum }
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
                                onChangeText={ setCustomer }
                                value={ customer }
                                placeholder="ФИО заказчика"
                            />
                        </View>

                        <Dialog.Actions>
                            <Button 
                                title="Далее"
                                style={{ width: 100}} 
                                onPress={ ()=>{
                                    // track('HomeScreen-NewAcceptance-Address-Press', { address } );
                                    toggleApartmentAddressDialogIsVisible();
                                    toggleApartmentSquareDialogIsVisible();
                                }} 
                            />
                        </Dialog.Actions>
                    </Dialog>

                    <Dialog
                        key={'accountExitDialog'}
                        isVisible={accountExitDialogIsVisible}
                        onBackdropPress={toggleAccountExitDialogIsVisible}
                    >
                        <Text style={{fontSize: 22, fontWeight: 700}}>
                            Учетная запись
                        </Text>
                        
                        <View>
                            <Text>Аккаунт: {user.username}</Text>
                            <Text>Устройство: {deviceId}</Text>
                            <Text>Авторизация до: { user.signedInTimeout }</Text>
                        </View>

                        <Dialog.Actions>
                            <Button 
                                title={`Выйти из учетной записи`}
                                onPress={ ()=>{
                                    // track('HomeScreen-NewAcceptance-Address-Press', { address } );
                                    AsyncStorage
                                    .setItem( "user", JSON.stringify({...user, signedInTimeout: Date.now() }))
                                    .then( ()=>setIsSignedIn(false) )
                                    toggleAccountExitDialogIsVisible();
                                }} 
                            />
                        </Dialog.Actions>
                    </Dialog>



                    <Dialog
                        key={'apartmentSquare'}
                        isVisible={apartmentSquareDialogIsVisible}
                        onBackdropPress={toggleApartmentSquareDialogIsVisible}
                    >
                        <Text style={{fontSize: 22, fontWeight: 700}}>
                            Площадь и тип отделки
                        </Text>

                        <View style={{
                            flexDirection: 'row',
                            flexWrap: 'wrap',
                        }}
                        >               
                            <TextInput
                                style={{
                                    height: 40,
                                    borderBottomColor: theme.lightColors.grey3,
                                    borderBottomWidth: 2,
                                    fontSize: 28,
                                    padding: 2,
                                    marginLeft: 10,
                                    marginRight: 10,
                                    width: 55
                                }}
                                inputMode='numeric'
                                onChangeText={ setSquareLocal }
                                placeholder="00"
                                value={square}
                            />
                            <Text style={{ fontSize: 22, marginTop: 10 }}>м²</Text>
                        </View>
                        
                        <View style={{ marginLeft: 0}}>
                            {designTypes.map((designType, i) => (
                                <CheckBox
                                    key={i}
                                    title={designType.name}
                                    checkedIcon="dot-circle-o"
                                    uncheckedIcon="circle-o"
                                    checked={designTypeSelected == i}
                                    onPress={() => setDesignTypeSelectedLocal(i)}
                                    containerStyle={{ 
                                        backgroundColor: 'white', 
                                        borderWidth: 0,
                                        marginBottom: 5,
                                        padding: 0
                                    }}
                                />
                            ))}
                        </View>

                        <Dialog.Actions>
                            <Button 
                                title="Далее"
                                style={{ width: 100}} 
                                onPress={ ()=>{
                                    // track('HomeScreen-NewAcceptance-Square-Press', { address } );
                                    setDesignTypeSelected(designTypeSelected)
                                    navigation.navigate('Apartment', { user, address, apartmentNum, customer, designTypeSelected, designTypes, getPreviousForms });
                                    toggleApartmentSquareDialogIsVisible()
                                    setSquare(square)
                                    setAddress('');
                                }} 
                            />
                        </Dialog.Actions>
                    </Dialog>

                    <StatusBar style="auto" />
                </ThemeProvider>
            </View>
        </ScrollView>
    );
  };