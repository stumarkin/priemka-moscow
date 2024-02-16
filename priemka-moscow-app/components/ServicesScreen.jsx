import { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import {BannerView} from './BannerView';
import { 
    View, 
    ScrollView, 
    Linking
} from 'react-native';
import { 
    ThemeProvider, 
    Text, 
    Button, 
    Divider,
    Skeleton
} from '@rneui/themed';
import { theme } from './theme';
import * as API from '../data/API';
import * as Config from '../data/Config';

import * as SecureStore from 'expo-secure-store';

import { init, track } from '@amplitude/analytics-react-native';


const getDeviceId = async () => {
    let deviceId = await SecureStore.getItemAsync('deviceId');
    if (!deviceId) {
        deviceId = generateId(19);
        await SecureStore.setItemAsync('deviceId', deviceId);
    }
    return deviceId;
}

export default function ServicesScreen ({navigation}) {
    const [isInitialLoading, setIsInitialLoading] = useState(true);
    const [deviceId, setDeviceId] = useState(null)
    const [banners, setBanners] = useState([]);
    const [bannerSection, setBannerSection] = useState(null);
    const [counter, setCounter] = useState( 0 )

    // Initial
    useEffect(() => {
        // Device Id
        getDeviceId()
        .then(deviceId =>{ 
            setDeviceId(deviceId)
            init(Config.AmplitudeKey, deviceId);
            track('ServicesScreen-View'); 
        } )
        
        API.Get(`getservicesbanners`)
        .then(res => {
            if (res.data.result === true ){
                setBanners( res.data.banners );
                setIsInitialLoading(false)
            } else {
                console.log( 'Banner load fail. API response:\n' + res.data ) 
            }
        }) 
    }, []);  

    useEffect(() => {
        // something to do on inside webview action
        console.log('counter update')
    }, [counter]);  




    // Banners with sections sorting
    const bannersUI = banners.filter( ({section}) => !bannerSection || section==bannerSection ).map( (banner, i) => (
         <BannerView 
            key={i}  
            {...banner} 
            onPress={() =>{
                track('ServicesScreen-Banner-Press', { banner: banner.header });
                if (banner.webviewUrl){
                    navigation.navigate('Webview', {title: '', deviceid: deviceId, callback: ()=>{setCounter(counter+1)}, url: banner.webviewUrl + (banner.webviewUrl.indexOf('?')>-1 ? '&' : '?') + 'deviceid=' + deviceId })
                } else if (banner.outerUrl){
                    Linking.openURL(banner.outerUrl)
                } else {
                    navigation.navigate('Webview', {title: '', deviceid: deviceId, callback: ()=>{setCounter(counter+1)}, url: 'https://priemka-pro.ru/webview/services/index.php?id=' + banner.id + 'deviceid=' + deviceId })
                }
            }}
         />
         )
    );
    const bannerSections = banners?.map(({section})=>(section)).filter( (item, i, arr) => arr.indexOf(item) === i );

    const bannersSectionsUI = bannerSections.map( (section, i) => (
        <Button
            key={i}
            title={section} 
            containerStyle={{ marginRight: 15, marginBottom:15}}
            buttonStyle={{ 
                backgroundColor: ( bannerSection!=section ? '#DEDEDE' : '#555'),
                borderColor: 'transparent',
                borderWidth: 0,
                borderRadius: 5,
                fontWeight: 100,
                padding: 4,
            }}
            titleStyle={{ 
                fontWeight: '500',
                color: ( bannerSection!=section ? 'black' : 'white'),
                fontSize: 14,

            }}
            onPress={ ()=>{
                track('ServicesScreen-Chips-Press', { chips: section });
                setBannerSection( bannerSection!=section ? section : null )
            }}
        >

        </Button>
    ));


    return (
        <ScrollView>
            <View style={{ padding: 20, paddingTop: 100}}>
                <ThemeProvider theme={theme}>
                    <Text style={{fontSize: 36, fontWeight: 700}}>Услуги</Text>
                    {
                        isInitialLoading ? (
                            <>
                                <Skeleton animation="pulse" height={170} style={{borderRadius: 10}}/>
                                <Divider  width={10} style={{ opacity: 0 }} />
                                <Skeleton animation="pulse" height={170} />
                                <Divider  width={10} style={{ opacity: 0 }} />
                                <Skeleton animation="pulse" height={370} />
                            </>
                        ) : (
                            <>
                                <View 
                                
                                    style={[{
                                                flexDirection: 'row',
                                                flexWrap: 'wrap'
                                            }]}
                                >
                                    {bannersSectionsUI}
                                </View>
                                {bannersUI}
                            </>
                        )
                    }
                    {/* <Text style={{ textAlign: 'center', fontSize: 12 }}>{deviceId}</Text> */}
                    <StatusBar style="auto" />
                </ThemeProvider>
            </View>
        </ScrollView>
    );
}