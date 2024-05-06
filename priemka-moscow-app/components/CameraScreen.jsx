import React, { useState, useEffect } from 'react';
import {Alert, StyleSheet, View, Image, TouchableOpacity } from 'react-native';
import { Camera } from 'expo-camera';
import * as Haptics from 'expo-haptics';
import { 
    Button, 
} from '@rneui/themed';
import * as FileSystem from 'expo-file-system';
import * as API from '../data/API';


export default function Add({ navigation, route }) {
  const AmplitudeTrack = (event, obj) => route.params.AmplitudeTrack(event, obj)
  const onGoBack = ( val ) => route.params.onGoBack( val );
  const {
    formId, 
    authtoken
  } = route.params;

  const [cameraPermission, setCameraPermission] = useState(null);
  const [galleryPermission, setGalleryPermission] = useState(null);

  const [camera, setCamera] = useState(null);
  const [imageUri, setImageUri] = useState(null);
  const [type, setType] = useState(Camera.Constants.Type.back);
  const [isSendingPhoto, setIsSendingPhoto] = useState(false);
  
  const permisionFunction = async () => {
    // here is how you can get the camera permission
    const cameraPermission = await Camera.requestCameraPermissionsAsync();
    setCameraPermission(cameraPermission.status === 'granted');
    if (
      cameraPermission.status !== 'granted'
    ) {
      alert('Permission for media access needed.');
    }
  };
  

  const getAllFiles = async ( dir ) => {
    const files = await FileSystem.readDirectoryAsync( dir )
    files.forEach( async (file) => {
        console.log(file);
        FileSystem.getInfoAsync( dir + '/' + file )
        .then( (fileInfo)=>{
            console.log( file + ' ' + (fileInfo.size/(1024*1024)).toFixed(1) + 'Mb') 
        })
    })
  };


  const uploadFile = async ( imageUri ) => {
    // console.log('uploadFile: ' + imageUri );
    if (imageUri != null) {
        
        const formData = new FormData();
        formData.append('formid', formId)
        formData.append('file', {
          uri: imageUri,
          type: 'image/jpeg',
          name: imageUri.split('/').pop(),
        });
        
        API.Post({ method:'uploadformfile', authtoken }, formData)
        .then(res => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)

            if (res.data.result===true){
                onGoBack( res.data.uri )
                navigation.goBack()
            } else {
                console.log(res.data)
                Alert.alert('❌\nНе загрузилось', 'Проверьте подключение к интернету и попробуйте еще раз')
            }
        })
        .catch((err)=>{
            console.log(err);
        })
        .finally(()=>{
            setImageUri( null )
            setIsSendingPhoto(false)
            FileSystem.deleteAsync(imageUri)
        })
    } else {
        console.log('uploadFile error: file not selected');
    }
};

  useEffect(() => {
    permisionFunction();
  }, []);

  const takePicture = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    if (camera) {
      const data = await camera.takePictureAsync({
        quality: 0.2, // Adjust this value (0.0 - 1.0) for picture quality
        skipProcessing: true, // Set to true to skip processing
     });
    setImageUri(data.uri);
    }
  };


  return (
    <View style={styles.container}>
      
      {
        imageUri ? (
            <>
                <Image source={{ uri: imageUri }} style={{ flex: 1, height: 100, width: '100%' }} />
                <View style={{flexDirection: 'row' }}>
                    <Button
                        key='reshot'
                        type='clear'
                        onPress={() => {
                            AmplitudeTrack('App-CameraScreen-ReShot-Press');
                            setImageUri( null )
                        }}
                        buttonStyle={{ margin: 10 }}
                        titleStyle={{ color: '#FFF'}}
                        containerStyle={{
                            width: 200,
                            height: 60,
                            marginTop: 40,
                            marginBottom: 40,
                          }}
                        disabled={isSendingPhoto}
                    >
                        Переснять
                    </Button>
                    <Button
                        key='sendPhoto'
                        loading={isSendingPhoto}
                        loadingProps={{
                            size: 'small',
                            color: 'black',
                        }}
                        onPress={() => {
                            AmplitudeTrack('App-CameraScreen-SendPhoto-Press');
                            setIsSendingPhoto(true)
                            uploadFile( imageUri )
                        }}
                        buttonStyle={{ margin: 10, backgroundColor: 'lightgrey' }}
                        titleStyle={{ color: '#000' }}
                        containerStyle={{
                            width: 200,
                            height: 60,
                            marginTop: 40,
                            marginBottom: 40,
                            marginRight: 10,
                          }}
                    >
                        Сохранить
                    </Button>
                </View>
            </>
        ) : (
            <>
                <View style={styles.cameraContainer}>
                    <Camera
                        ref={(ref) => setCamera(ref)}
                        style={styles.fixedRatio}
                        type={type}
                        ratio={'1:1'}
                    />
                </View>
                <TouchableOpacity
                    style={{
                        borderWidth: 2,
                        borderColor:'rgba(0,0,0,0.2)',
                        alignItems:'center',
                        justifyContent:'center',
                        width:80,
                        height:80,
                        backgroundColor:'#fff',
                        borderRadius:50,
                        marginBottom: 50
                    }}
                    onPress={ takePicture }
                />
            </>
        )
        }
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    padding: 5,
    backgroundColor: 'black'
  },
  cameraContainer: {
    flex: 1,
    flexDirection: 'row',
    paddingBottom: 20,
    paddingTop: 20,
  },
  fixedRatio: {
    flex: 1,
    // aspectRatio: 1,
    borderColor: 'grey',
    borderWidth: 1
  },
  button: {
    flex: 0.1,
    padding: 10,
    alignSelf: 'flex-end',
    alignItems: 'center',
  },
});