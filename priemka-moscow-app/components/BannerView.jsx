import { 
    View, 
    Pressable, 
    ImageBackground,
    Image,
    Linking
} from 'react-native';
import { 
    Text, 
    ListItem,
    Divider,
    Icon,
} from '@rneui/themed';


export function BannerIsOverdued(){
    return (
        <BannerView 
            header="Тут только отчет"
            text="Эту приёмку больше нельзя изменять, т.к.&nbsp;прошло более cуток с ее создания. По-прежнему можно получить отчёт по&nbsp;ней. На&nbsp;Pro тарифе этого ограничения нет."
            backgroundColor="#ffbf0f"
        /> 
    )
}

export function BannerNeedUpdate( props ){
    return (
        <BannerView 
            header="Обновите приложение"
            text="В последней версии испрелены ошибки и добавлены новые возможности."
            backgroundColor="#ffbf0f"
            onPress={ ()=>{
                props.track('HomeScreen-BannerNeedUpdate-Press');
                Linking.openURL(props.appUpdateUrl)
            } }
        /> 
    )
}

export  function BannerView (props) {
    const {
        onPress, 
        backgroundImage, 
        backgroundColor = (backgroundColor || '#FFF'), 
        header, 
        isClosable = (isClosable || false), 
        textColor = (textColor || '#000'), 
        text, 
        actionControls,
        button
    } = props;
    return (
        <View>
            <Pressable onPress={onPress}>
                <ImageBackground 
                    // source={ backgroundImage ? {uri: backgroundImage} : null } 
                    resizeMode="cover" 
                    style={{
                        backgroundColor: backgroundColor, 
                        padding: 0,
                        borderRadius: 10,
                        overflow: 'hidden'
                    }}
                >
                    {   // Header
                        header ? (
                            <>
                                <ListItem 
                                    key={0} 
                                    containerStyle={{
                                        backgroundColor: 'transparent', 
                                        paddingTop: 20, 
                                        paddingHorizontal: 20, 
                                        paddingBottom: 0,
                                    }}
                                >
                                    <ListItem.Content>
                                        <ListItem.Title style={{color: textColor, fontSize: 22, fontWeight: 700}}>{header}</ListItem.Title>
                                    </ListItem.Content>
                                    {isClosable ? <Icon type='ionicon' name="close" color="grey"/> : ''}
                                </ListItem>
                                <Divider width={10} style={{ opacity: 0 }} />
                            </>
                        ) : null
                    }

                    <View
                        style={{
                            justifyContent: 'space-between', 
                            flexDirection: 'row',
                        }}
                    >
                        {   // Text
                            text ? (
                                <Text 
                                    style={{
                                        width: (backgroundImage ? '70%' : '100%'), 
                                        color: textColor, 
                                        fontSize: 14, 
                                        marginBottom: 0,
                                        paddingLeft: 20,
                                        paddingRight: (backgroundImage ? 0: 20),
                                        paddingBottom: (actionControls||button ? 10: 20) 
                                    }}
                                >
                                    {text}
                                </Text>
                            ) : null 
                        }
                        {   // Text
                            backgroundImage ? (
                                    <Image
                                        style={{width:'30%'}}
                                        source={ backgroundImage ? {uri: backgroundImage} : null } 
                                        resizeMode="contain" 
                                        
                                  />
                                
                            ) : null 
                        }
                    </View>

                    { 
                        actionControls ? (
                            <View
                                style={{ paddingHorizontal: 20, paddingVertical: 10 }}
                            >
                                { actionControls }
                            </View>
                        ) : null
                    }

                    { 
                        button ? (
                            <View
                                style={{ paddingHorizontal: 10, paddingBottom: 10 }}
                            >
                                { button }
                            </View>
                        ) : null
                    }
                </ImageBackground>
            </Pressable>
            <Divider width={10} style={{ opacity: 0 }} />
        </View>
    )
}