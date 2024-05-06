/**
 * @author Sergey Tumarkin https://tumarkin.me
 */

import { useState, useEffect, useCallback } from 'react';
import { 
    ActivityIndicator,
    ScrollView, 
    TextInput,
    StyleSheet,
    Platform,
    Alert,
    Image
} from 'react-native';
import { 
    Button,
} from '@rneui/themed';
import { theme } from './theme';
import { BannerView, BannerNeedUpdate } from './BannerView';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as API from '../data/API';
import * as Config from '../data/Config';
import * as SecureStore from 'expo-secure-store';
import Images  from '../assets/index';

// md5 javascript function php equivalent
function md5(inputString) {
    var hc="0123456789abcdef";
    function rh(n) {var j,s="";for(j=0;j<=3;j++) s+=hc.charAt((n>>(j*8+4))&0x0F)+hc.charAt((n>>(j*8))&0x0F);return s;}
    function ad(x,y) {var l=(x&0xFFFF)+(y&0xFFFF);var m=(x>>16)+(y>>16)+(l>>16);return (m<<16)|(l&0xFFFF);}
    function rl(n,c)            {return (n<<c)|(n>>>(32-c));}
    function cm(q,a,b,x,s,t)    {return ad(rl(ad(ad(a,q),ad(x,t)),s),b);}
    function ff(a,b,c,d,x,s,t)  {return cm((b&c)|((~b)&d),a,b,x,s,t);}
    function gg(a,b,c,d,x,s,t)  {return cm((b&d)|(c&(~d)),a,b,x,s,t);}
    function hh(a,b,c,d,x,s,t)  {return cm(b^c^d,a,b,x,s,t);}
    function ii(a,b,c,d,x,s,t)  {return cm(c^(b|(~d)),a,b,x,s,t);}
    function sb(x) {
        var i;var nblk=((x.length+8)>>6)+1;var blks=new Array(nblk*16);for(i=0;i<nblk*16;i++) blks[i]=0;
        for(i=0;i<x.length;i++) blks[i>>2]|=x.charCodeAt(i)<<((i%4)*8);
        blks[i>>2]|=0x80<<((i%4)*8);blks[nblk*16-2]=x.length*8;return blks;
    }
    var i,x=sb(inputString),a=1732584193,b=-271733879,c=-1732584194,d=271733878,olda,oldb,oldc,oldd;
    for(i=0;i<x.length;i+=16) {olda=a;oldb=b;oldc=c;oldd=d;
        a=ff(a,b,c,d,x[i+ 0], 7, -680876936);d=ff(d,a,b,c,x[i+ 1],12, -389564586);c=ff(c,d,a,b,x[i+ 2],17,  606105819);
        b=ff(b,c,d,a,x[i+ 3],22,-1044525330);a=ff(a,b,c,d,x[i+ 4], 7, -176418897);d=ff(d,a,b,c,x[i+ 5],12, 1200080426);
        c=ff(c,d,a,b,x[i+ 6],17,-1473231341);b=ff(b,c,d,a,x[i+ 7],22,  -45705983);a=ff(a,b,c,d,x[i+ 8], 7, 1770035416);
        d=ff(d,a,b,c,x[i+ 9],12,-1958414417);c=ff(c,d,a,b,x[i+10],17,     -42063);b=ff(b,c,d,a,x[i+11],22,-1990404162);
        a=ff(a,b,c,d,x[i+12], 7, 1804603682);d=ff(d,a,b,c,x[i+13],12,  -40341101);c=ff(c,d,a,b,x[i+14],17,-1502002290);
        b=ff(b,c,d,a,x[i+15],22, 1236535329);a=gg(a,b,c,d,x[i+ 1], 5, -165796510);d=gg(d,a,b,c,x[i+ 6], 9,-1069501632);
        c=gg(c,d,a,b,x[i+11],14,  643717713);b=gg(b,c,d,a,x[i+ 0],20, -373897302);a=gg(a,b,c,d,x[i+ 5], 5, -701558691);
        d=gg(d,a,b,c,x[i+10], 9,   38016083);c=gg(c,d,a,b,x[i+15],14, -660478335);b=gg(b,c,d,a,x[i+ 4],20, -405537848);
        a=gg(a,b,c,d,x[i+ 9], 5,  568446438);d=gg(d,a,b,c,x[i+14], 9,-1019803690);c=gg(c,d,a,b,x[i+ 3],14, -187363961);
        b=gg(b,c,d,a,x[i+ 8],20, 1163531501);a=gg(a,b,c,d,x[i+13], 5,-1444681467);d=gg(d,a,b,c,x[i+ 2], 9,  -51403784);
        c=gg(c,d,a,b,x[i+ 7],14, 1735328473);b=gg(b,c,d,a,x[i+12],20,-1926607734);a=hh(a,b,c,d,x[i+ 5], 4,    -378558);
        d=hh(d,a,b,c,x[i+ 8],11,-2022574463);c=hh(c,d,a,b,x[i+11],16, 1839030562);b=hh(b,c,d,a,x[i+14],23,  -35309556);
        a=hh(a,b,c,d,x[i+ 1], 4,-1530992060);d=hh(d,a,b,c,x[i+ 4],11, 1272893353);c=hh(c,d,a,b,x[i+ 7],16, -155497632);
        b=hh(b,c,d,a,x[i+10],23,-1094730640);a=hh(a,b,c,d,x[i+13], 4,  681279174);d=hh(d,a,b,c,x[i+ 0],11, -358537222);
        c=hh(c,d,a,b,x[i+ 3],16, -722521979);b=hh(b,c,d,a,x[i+ 6],23,   76029189);a=hh(a,b,c,d,x[i+ 9], 4, -640364487);
        d=hh(d,a,b,c,x[i+12],11, -421815835);c=hh(c,d,a,b,x[i+15],16,  530742520);b=hh(b,c,d,a,x[i+ 2],23, -995338651);
        a=ii(a,b,c,d,x[i+ 0], 6, -198630844);d=ii(d,a,b,c,x[i+ 7],10, 1126891415);c=ii(c,d,a,b,x[i+14],15,-1416354905);
        b=ii(b,c,d,a,x[i+ 5],21,  -57434055);a=ii(a,b,c,d,x[i+12], 6, 1700485571);d=ii(d,a,b,c,x[i+ 3],10,-1894986606);
        c=ii(c,d,a,b,x[i+10],15,   -1051523);b=ii(b,c,d,a,x[i+ 1],21,-2054922799);a=ii(a,b,c,d,x[i+ 8], 6, 1873313359);
        d=ii(d,a,b,c,x[i+15],10,  -30611744);c=ii(c,d,a,b,x[i+ 6],15,-1560198380);b=ii(b,c,d,a,x[i+13],21, 1309151649);
        a=ii(a,b,c,d,x[i+ 4], 6, -145523070);d=ii(d,a,b,c,x[i+11],10,-1120210379);c=ii(c,d,a,b,x[i+ 2],15,  718787259);
        b=ii(b,c,d,a,x[i+ 9],21, -343485551);a=ad(a,olda);b=ad(b,oldb);c=ad(c,oldc);d=ad(d,oldd);
    }
    return rh(a)+rh(b)+rh(c)+rh(d);
}

const getDeviceId = async () => {
    let deviceId = await SecureStore.getItemAsync('deviceId');
    if (!deviceId) {
        deviceId = generateId(19);
        await SecureStore.setItemAsync('deviceId', deviceId);
    }
    return deviceId;
}

export default function SignInScreen ({navigation, route}) {
    const setAuthtoken = ( val ) => route.params.setAuthtoken( val );
    const {username} =  route.params;
    const setUsername = ( val ) => route.params.setUsername( val );
    const setAppIsOffline = ( val ) => route.params.setAppIsOffline( val );
    
    const [isLoading, setIsLoading] = useState(true);

    const [deviceId, setDeviceId] = useState(null)
    
    const [usernameInputValue, setUsernameInputValue] = useState( '' )
    const [password, setPassword] = useState( '' )
    
    const [name, setName] = useState( '' )
    
    
    const [registerUI, setRegisterUI] = useState( false )


    const model = Platform.select({
      ios: (Platform.isPad ? 'iPad' : 'iPhone'),
      android: Platform.constants.Model,
      default: 'Unknown',
    });

    const osVersion = Platform.select({
      ios: 'iOS ' + Platform.Version,
      android: 'Android' + Platform.Version,
      default: ''
    });
    

    const LogIn = () => {
        if (usernameInputValue==''||password==''){
            Alert.alert('Что-то забыли', 'Укажите логин и пароль для входа')
            return
        }

        API.Post( {method: 'login'}, {
            username: usernameInputValue.toLowerCase().trim(), 
            password: md5(password), 
            deviceid: deviceId,
            device: `${model}, ${osVersion}` 
        })
        .then( ({data}) => {
            console.log(data)
            const {result, authtoken} = data
            if ( result ){
                AsyncStorage.setItem( "username", usernameInputValue.toLowerCase().trim() )
                AsyncStorage.setItem( "authtoken", authtoken )
                setUsername( usernameInputValue.toLowerCase().trim() )
                setAuthtoken( authtoken )
            } else {
                console.log('LogIn failed');
                Alert.alert('Не удалось войти', 'Проверьте логин/пароль и попробуйте снова. Восстановить пароль можно на priemka-pro.ru')
            }
        })
        .catch(err => {
            console.log('LogIn failed: ' + err);
        })
    }

    const CreateAccount = () => {
        if (usernameInputValue==''||name==''){
            Alert.alert('Что-то забыли', 'Укажите логин и наименование вашей компании для регистрации')
            return
        }

        API.Post( {method: 'createaccount'}, {
            username: usernameInputValue.toLowerCase(), 
            name,
            app: 'app', 
            deviceid: deviceId,
            device: `${model}, ${osVersion}` 
        })
        .then( ({data}) => {
            console.log(data)
            const {result, authtoken, error} = data
            if ( result ){
                AsyncStorage.setItem( "username", usernameInputValue.toLowerCase().trim() )
                AsyncStorage.setItem( "authtoken", authtoken )
                Alert.alert('🎉\nРегистрация успешна', 'Проверьте указанный вами e-mail. На него отправили пароль, ссылку на панель управления и инфо по следующим шагам для начала работы.')
                setUsername( usernameInputValue.toLowerCase().trim() )
                setAuthtoken( authtoken )
            } else {
                console.log('CreateAccount failed');
                Alert.alert('Не удалось 🤔', error)
            }
        })
        .catch(err => {
            console.log('CreateAccount failed: ' + err);
        })
    }

    // Initial loading
    useEffect(() => {
        getDeviceId()
        .then(deviceId =>{ 
            setDeviceId(deviceId)
            init(Config.AmplitudeKey, deviceId);
            track('SignInScreen-View');
        } )

        // AsyncStorage.clear()
        // AsyncStorage.removeItem('user')
        // AsyncStorage.removeItem('applicationId')
        // AsyncStorage.removeItem('authtoken')

        AsyncStorage.getItem('authtoken')
        .then( authtoken => {
            if (authtoken){
                API.Get({ method:'auth', authtoken })
                .then(({data}) => {
                    console.log( data ) 
                    setAppIsOffline(false)
                    if (data.result){
                        setAuthtoken(authtoken) 
                    }
                })
                .catch( err => {
                    setAuthtoken(authtoken) 
                    console.log( 'auth error. \n' + JSON.stringify(err) ) 
                })
                .finally(()=>setIsLoading(false))
            } else {
                AsyncStorage.clear()
                setIsLoading(false)
            }
        })
        
        AsyncStorage.getItem('username')
        .then( username => {
            setUsername(username||'')
            setUsernameInputValue(username||'')
        })
    }, []);

    if (isLoading){
        return (
            <ScrollView contentContainerStyle={{ flexGrow: 1, paddingTop: 250}}>
                <ActivityIndicator size="large" />
            </ScrollView>
        )
    }

    return (
        <ScrollView 
            contentContainerStyle={{ flexGrow: 1 }}
            style={{ padding: 20, paddingTop:100}}
        >
            {/* <Image 
                source={Images.logo} 
                style={{marginHorizontal:20, paddingVertical:50, width:'80%', height:50}}
                resizeMode="contain"
            /> */}
            {/* <Text style={{padding: 18, paddingBottom:40, fontSize:14}} >Приложение для бизнеса по&nbsp;экспертной приёмке квартир в&nbsp;новостройках.</Text> */}
            
            {
                registerUI ? (
                    <>
                        <BannerView 
                            key={'new'}
                            header="Регистрация компании"
                            button={ 
                                <>
                                    <TextInput
                                        style={ styles.input }
                                        onChangeText={ setUsernameInputValue }
                                        value={usernameInputValue?.toLowerCase()}
                                        placeholder="E-mail"
                                    />
            
                                    <TextInput
                                        style={ styles.input }
                                        onChangeText={ setName }
                                        value={name}
                                        placeholder="Название компании"
                                    />
            
                                    <Button 
                                        title="Зарегистрировать"
                                        // style={{ borderRadius: 15, margin: 10 }}
                                        buttonStyle={{ 
                                            borderColor: 'transparent',
                                            borderWidth: 0,
                                            borderRadius: 5,
                                            padding: 15,
                                            marginLeft: 10,
                                            marginRight: 10,
                                            marginTop: 10,
                                            backgroundColor: theme.lightColors.primary,
                                        }}
                                        onPress={CreateAccount} 
                                    />
                                </>
                            }
                        /> 
                        <Button 
                            type="outline"
                            title="Вход"
                            // style={{ borderRadius: 15, margin: 10 }}
                            buttonStyle={{ 
                                borderColor: 'transparent',
                                borderWidth: 0,
                                borderRadius: 5,
                                padding: 15,
                                marginLeft: 10,
                                marginRight: 10,
                            }}
                            onPress={ ()=>{
                                setRegisterUI( false )
                            }} 
                        />
                    </>

                ):(
                    <>
                        <BannerView 
                            key={'new'}
                            header="Вход"
                            // text= {`Это приложения для специалистов компании ${Config.CompanyName}. Если вы являетесь сотрудником, но не имеете данных для входа, обратитесь к своему руководителю.`}
                            button={ 
                                <>
                                    <TextInput
                                        value={usernameInputValue?.toLowerCase()}
                                        onChangeText={ setUsernameInputValue }
                                        style={ styles.input }
                                        placeholder="Логин"
                                    />
            
                                    <TextInput
                                        value={password}
                                        onChangeText={ setPassword }
                                        secureTextEntry={true}
                                        style={ styles.input }
                                        placeholder="Пароль"
                                    />
            
                                    <Button 
                                        title="Войти"
                                        buttonStyle={{ 
                                            borderColor: 'transparent',
                                            borderWidth: 0,
                                            borderRadius: 5,
                                            padding: 15,
                                            marginLeft: 10,
                                            marginRight: 10,
                                            marginTop: 10,
                                            backgroundColor: theme.lightColors.primary,
                                        }}
                                        onPress={LogIn} 
                                    />
                                </>
                            }
                        /> 
                        {/* <Button 
                            type="outline"
                            title="Регистрация"
                            buttonStyle={{ 
                                borderColor: 'transparent',
                                borderWidth: 0,
                                borderRadius: 5,
                                padding: 15,
                                marginLeft: 10,
                                marginRight: 10,
                            }}
                            onPress={ ()=>{
                                setRegisterUI( true )
                            }} 
                        /> */}
                    </>
                )
            }
            {/* <Text style={{paddingTop: 100, textAlign: 'center', color: 'grey'}}>Разработка tumarkin.me</Text>  */}

        </ScrollView> 
    )
}

const styles = StyleSheet.create({
    input: {
        height: 40,
        borderColor: theme.lightColors.grey3,
        borderWidth: 1,
        borderRadius: 5,
        fontSize: 19,
        padding: 10,
        margin: 10
    }
  });