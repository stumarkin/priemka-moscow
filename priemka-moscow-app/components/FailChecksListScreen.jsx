/**
 * @author Sergey Tumarkin https://tumarkin.me
 */

import { useState, useEffect } from 'react';
import { 
    ScrollView,
    View, 
    Alert,
    Share
} from 'react-native';
import { 
    Text, 
    Button, 
    ListItem,
    Switch,
} from '@rneui/themed';
import { theme } from './theme';


export default function FailChecksListScreen ({navigation, route}) {
    const {
      ProDaysLeft,
      content,
      contentWithClauses
    } = route.params;
    const  [showReportnames, setShowReportnames] = useState(ProDaysLeft>0) 
    
    const onShare = async ( message ) => {
        try {
          const result = await Share.share({
            message,
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
    
      useEffect(() => {
            navigation.setOptions({
              headerRight: () => (
                <Button 
                    onPress={()=>onShare(showReportnames ? contentWithClauses : content)}
                    title={'Отправить'}
                    type="clear" 
                    color="primary"
                    titleStyle={{ fontSize: 17}}
                />
              ),
            });
      }, [navigation, showReportnames]);

    return (
        <View>   
          <ListItem key="refs" style={{borderBottomWidth: 1, borderBottomColor: 'lightgrey'}}>
              <ListItem.Content>
                  <ListItem.Title>Cо ссылками на СНиП и СП</ListItem.Title>
              </ListItem.Content>
              <Switch
                  value={showReportnames}
                  onValueChange={ () => setShowReportnames(!showReportnames) }
                  color={theme.lightColors.primary}
                  />
          </ListItem>
          <ScrollView>
              <Text
                  style={{
                      padding: 20,
                      paddingBottom: 50,
                      fontSize: 16
                  }}
              >
                  { showReportnames ? contentWithClauses : content }
              </Text>
          </ScrollView>
        </View>
    )
}