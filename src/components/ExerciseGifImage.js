import React from 'react';
import { Image } from 'react-native';
import static_workouts from "../database/static_workouts.json"

const getGifUrl = (path) => {
  return `https://ironinsight-bucket.s3.eu-west-1.amazonaws.com/static_exercise_gifs/exercise_gifs/${path}`;
}

export default function ExerciseGifImage({ exerciseName="", url="", style={} }) {
  if(exerciseName){
    url = static_workouts.find(exercise => exercise.name === exerciseName).gifUrl;
  }
  const fullUrl = getGifUrl(url);

  return (
    <Image
      style={style}
      source={{ uri: fullUrl }}
    />
  );
}
