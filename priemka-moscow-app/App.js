/**
 * @author Sergey Tumarkin https://tumarkin.me
 */

import { useState, useEffect } from 'react';
import SignInScreen from './components/SignInScreen';
import HomeScreen from './components/HomeScreen';
import ApartmentScreen from './components/ApartmentScreen';
import RoomScreen from './components/RoomScreen';
import CheckScreen from './components/CheckScreen';
import CameraScreen from './components/CameraScreen';
import FailChecksListScreen from './components/FailChecksListScreen';
import WebviewScreen from './components/WebviewScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon } from '@rneui/themed';
import * as NavigationBar from 'expo-navigation-bar';
import * as Application from 'expo-application';
import { 
  Platform,
} from 'react-native';
import * as Sentry from "@sentry/react-native";

Sentry.init({
  enableNative: false,
  dsn: "https://66aac3c0bde75caa5d81e71d33438809@o4506547929088000.ingest.sentry.io/4506753429602304",
  tracesSampleRate: 1.0,
  attachScreenshot: true,
  release: Application.nativeApplicationVersion
});

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();




function App() {
  const [authtoken, setAuthtoken] = useState( '' )
  const [username, setUsername] = useState( '' )
  const [appIsOffline, setAppIsOffline] = useState(true);

  
  function HomeScreenTabs() {
    return (
      <Tab.Navigator>
          <Tab.Screen 
            name="Home" 
            component={HomeScreen} 
            initialParams={{authtoken, setAuthtoken, username, appIsOffline }}
            options={{
              tabBarStyle: { display: 'none' },
              headerShown: false,
              tabBarLabel: 'Приёмка',
              tabBarIcon: ({ color, size }) => (
                <Icon 
                  name="checkbox-outline" 
                  type="ionicon" 
                />
                ),
              }}
              />
      </Tab.Navigator>
    );
  }


 
  if (Platform.OS == 'android') {
    NavigationBar.setBackgroundColorAsync("white");
  }

  
  return (
    <NavigationContainer>
      <Stack.Navigator>
        { !authtoken || authtoken.length == 0 ? (
          <>
            <Stack.Screen
              name="SignIn"
              component={SignInScreen} 
              initialParams={{ setAuthtoken, username, setUsername, setAppIsOffline }}
              options={{headerShown: false}}
              />
          </>
        ) : (
          <>
            <Stack.Screen
              name="HomeTab"
              component={HomeScreenTabs}
              options={{headerShown: false, title: ''}}
              />
            <Stack.Screen 
              name="Apartment" 
              component={ApartmentScreen} 
              options={{title: "Квартира" }}
            />
            <Stack.Screen 
              name="Room" 
              component={RoomScreen}
              options={({ route }) => ({ 
                title: route.params.title, 
              })}
            />
            <Stack.Screen 
              name="Check" 
              component={CheckScreen}
              options={({ route }) => ({ 
                title: 'Проверка', 
              })}
            />
            <Stack.Screen 
              name="Camera" 
              component={CameraScreen}
              options={({ route }) => ({ 
                title: route.params.title,
                headerStyle: {
                  backgroundColor: 'black',
                },
                headerTintColor: '#fff', 
              })}
            />
            <Stack.Screen 
              name="FailChecksList" 
              component={FailChecksListScreen}
              options={({ route }) => ({ 
                title: route.params.title, 
              })}
            />
            <Stack.Screen 
              name="Webview" 
              component={WebviewScreen}
              options={({ route }) => ({ 
                title: route.params.title,
                tabBarStyle: { display: "none" }, 
              })}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default Sentry.wrap(App);