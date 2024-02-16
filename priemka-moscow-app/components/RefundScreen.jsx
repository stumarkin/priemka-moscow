import { useState, useEffect } from 'react';
import {BannerView} from './BannerView';

import { StatusBar } from 'expo-status-bar';
import { 
    Alert,
    View, 
    ScrollView, 
    Pressable, 
    TextInput
} from 'react-native';
import { 
    ThemeProvider, 
    Text, 
    Button, 
    ListItem,
    Divider,
    Icon,
    CheckBox
} from '@rneui/themed';
import { theme } from './theme';
import * as SecureStore from 'expo-secure-store';
import * as Config from '../data/Config';

import { init, track } from '@amplitude/analytics-react-native';





const getDeviceId = async () => {
    let deviceId = await SecureStore.getItemAsync('deviceId');
    if (!deviceId) {
        deviceId = generateId(19);
        await SecureStore.setItemAsync('deviceId', deviceId);
    }
    return deviceId;
}

export default function RefundScreen ({navigation, route}) {

    const { designTypes } = route.params;
    const setSquare = ( val ) => route.params.setSquare( val );
    const setDesignTypeSelected = ( val ) => route.params.setDesignTypeSelected( val );
    const [square, setSquareLocal] = useState( route.params.square );
    const [designTypeSelected, setDesignTypeSelectedLocal] = useState( route.params.designTypeSelected );

    // if ( square > 0 ){
    //     navigation.navigate('RefundCalculation', {title: '', square, designTypes, designTypeSelected});
    // }
 
    // const [deviceId, setDeviceId] = useState(null)


    // Initial
    useEffect(() => {
        getDeviceId()
        .then( deviceId =>{ 
            setDeviceId(deviceId)
            init(Config.AmplitudeKey, deviceId);
            track('RefundScreen-View'); 
        } )
    }, []);  



    return (
        <ScrollView>
            <View style={{ padding: 20, paddingTop: 100}}>
                <ThemeProvider theme={theme}>
                    <Text style={{fontSize: 36, fontWeight: 700}}>Возмещение</Text>
                    
                    <BannerView 
                        header="Как его получить?"
                        text='Застрощик должен возместить дольщику стоимость устранения недостатков, если таковые будут выявлены. Для этого привлекается аккредитованные эксперты, на основании их заключения выдвигаются требования. Взыскание осуществляется в&nbsp;досудебном или судебном порядке.'
                        backgroundColor="#fefefe"
                    /> 

                    <BannerView 
                        header="Расчёт суммы"
                        text="На основе статистики возмещений других дольщиков можно рассчитать примерную сумму. Укажите площадь квартиры и тип отделки:"
                        backgroundColor="#fefefe"
                        actionControls={
                            <>
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
                                        onChangeText={setSquareLocal}
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
                            </>
                        }
                        button={
                            <Button
                                title='Расcчитать' 
                                onPress={() =>{
                                    if ( square!='' ){
                                        track('RefundScreen-CalculateRefund-Press', { square, designTypeSelected });
                                        navigation.navigate('RefundCalculation', {title: '', square, setSquare, designTypes, designTypeSelected});
                                    } else {
                                        alert('Укажите площадь вашей квартиры для расчета суммы возмещения.')
                                    }
                                }}
                            />
                        }
                    /> 
                    

                    <StatusBar style="auto" />
                </ThemeProvider>
            </View>
        </ScrollView>
    );
}