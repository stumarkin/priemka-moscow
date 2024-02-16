/**
 * @author Sergey Tumarkin https://tumarkin.me
 */

import { useState, useEffect } from 'react';
import SignInScreen from './components/SignInScreen';
import HomeScreen from './components/HomeScreen';
import ApartmentScreen from './components/ApartmentScreen';
import RoomScreen from './components/RoomScreen';
import FailChecksListScreen from './components/FailChecksListScreen';
import WebviewScreen from './components/WebviewScreen';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Icon } from '@rneui/themed';
import * as NavigationBar from 'expo-navigation-bar';
import { 
  Platform,
} from 'react-native';
import * as Sentry from "@sentry/react-native";

Sentry.init({
  enableNative: false,
  dsn: "https://66aac3c0bde75caa5d81e71d33438809@o4506547929088000.ingest.sentry.io/4506753429602304",
  tracesSampleRate: 1.0,
});

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();


function App() {
  const [isSignedIn, setIsSignedIn] = useState( false );
  const [user, setUser] = useState( {} );
  

  const designTypes = [
      {name: 'С чистовой отделкой', pricePerMetr: 10750},
      {name: 'White-box', pricePerMetr: 8750},
      {name: 'Без отделки', pricePerMetr: 6750},
  ]
  const [designTypeSelected, setDesignTypeSelected] = useState( 0 );
  const [square, setSquare] = useState( null );


  function HomeScreenTabs() {
    return (
      <Tab.Navigator>
          <Tab.Screen 
            name="Home" 
            component={HomeScreen} 
            initialParams={{ setIsSignedIn, setUser, user, designTypes, setSquare, setDesignTypeSelected }}
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
        {! isSignedIn ? (
          <>
            <Stack.Screen
              name="SignIn"
              component={SignInScreen} 
              initialParams={{ setIsSignedIn, setUser }}
              options={{headerShown: false}}
              />
          </>
        ) : (
          <>
            <Stack.Screen
              name="HomeTab"
              component={HomeScreenTabs}
              options={{headerShown: false, }}
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