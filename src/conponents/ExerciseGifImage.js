import React from 'react';
import { Image } from 'react-native';

const getGifUrl = (path) => {
  return `https://ironinsight-bucket.s3.eu-west-1.amazonaws.com/static_exercise_gifs/exercise_gifs/${path}`;
}

export default function ExerciseGifImage({ url, style={} }) {
  const fullUrl = getGifUrl(url);

  return (
    <Image
      style={style}
      source={{ uri: fullUrl }}
    />
  );
}
