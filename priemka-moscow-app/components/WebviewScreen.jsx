import { useState, useEffect } from 'react';
import { 
    StyleSheet, 
    Share,
    Linking
} from 'react-native';
import { 
    Button
} from '@rneui/themed';
import { WebView } from 'react-native-webview';



export default function WebviewScreen ({navigation, route}) {
    const callback = () => route.params.callback();

    const onShare = async () => {
        try {
          const result = await Share.share({
            message: route.params.url,
          });
          if (result.action === Share.sharedAction) {
            if (result.activityType) {
              // shared with activity type of result.activityType
            } else {
              // shared
            }
          } else if (result.action === Share.dismissedAction) {
            // dismissed
          }
        } catch (error) {
          Alert.alert(error.message);
        }
      };
    
      handleWebViewNavigationStateChange = (newNavState) => {
      
        const { url } = newNavState;
        if (!url) return;
    
        if (url.includes('#callback')) {
          callback()
        } else if (!url.includes('/webview/') && !url.includes('ampproject') && !url.includes('report') ) {
          Linking.openURL(url);
          return false;
        }
      };

    useEffect(() => {
        if (route.params.isSharable){
            navigation.setOptions({
              headerRight: () => (
                <Button 
                  onPress={onShare}
                  title={'Отправить'}
                  type="clear" 
                  color="primary"
                  titleStyle={{ fontSize: 17}}
              />
              ),
            });
        }
      }, [navigation]);

    return (
        <WebView
            ref={(ref) => (webview = ref)}
            originWhitelist={['*']}
            source={{ uri: route.params.url }}
            onNavigationStateChange={this.handleWebViewNavigationStateChange}
        />
    );
};

const styles = StyleSheet.create({
  mb10: {
    marginBottom: 10,
  },
  ml10: {
    paddingLeft: 20,
  },
});