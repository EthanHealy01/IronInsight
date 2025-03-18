import React, { useState, useEffect } from 'react';
import { Image, View, ActivityIndicator } from 'react-native';
import static_workouts from "../database/static_workouts.json"

const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second

const getGifUrl = (path) => {
  return `https://ironinsight.s3.us-east-1.amazonaws.com/exercise_gifs/${path}`;
}

export default function ExerciseGifImage({ exerciseName="", url="", style={}, resizeMode="contain" }) {
  const [imageUrl, setImageUrl] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let finalUrl = url;
    if (exerciseName) {
      const exercise = static_workouts.find(exercise => exercise.name === exerciseName);
      if (exercise) {
        finalUrl = exercise.gifUrl;
      }
    }
    if (finalUrl) {
      setImageUrl(getGifUrl(finalUrl));
      setIsLoading(true);
      setHasError(false);
      setRetryCount(0);
    }
  }, [exerciseName, url]);

  const handleLoadError = () => {
    console.error('Image load error, retry count:', retryCount);
    setHasError(true);
    
    if (retryCount < MAX_RETRIES) {
      setTimeout(() => {
        setRetryCount(prev => prev + 1);
        setHasError(false);
        // Force image refresh by adding timestamp
        setImageUrl(`${getGifUrl(url)}?timestamp=${new Date().getTime()}`);
      }, RETRY_DELAY);
    } else {
      setIsLoading(false);
    }
  };

  const handleLoadSuccess = () => {
    setIsLoading(false);
    setHasError(false);
  };

  if (!imageUrl) {
    return null;
  }


  return (
    <View style={[style, { justifyContent: 'center', alignItems: 'center' }]}>
      <Image
        style={[style, { opacity: isLoading ? 0 : 1 }]}
        source={{ 
          uri: imageUrl,
          cache: retryCount > 0 ? 'reload' : 'default'
        }}
        resizeMode={resizeMode}
        onError={handleLoadError}
        onLoadEnd={handleLoadSuccess}
      />
      {isLoading && !hasError && (
        <ActivityIndicator 
          size="small" 
          color="#999"
          style={{
            position: 'absolute',
            width: style.width || 50,
            height: style.height || 50
          }}
        />
      )}
    </View>
  );
}
