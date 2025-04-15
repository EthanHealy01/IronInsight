import React from "react";
import { Text, ScrollView, View } from "react-native";
import ActionSheet from "react-native-actions-sheet";
import ExerciseGifImage from "./ExerciseGifImage";
import { styles } from "../theme/styles";

const ExerciseSheet = (props) => {
  const exercise = props.payload?.exercise;
  const globalStyles = styles();

  return (
    <ActionSheet
      id={props.sheetId}
      // Add indicatorStyle to render a draggable bar at the top
      indicatorStyle={{
        width: 50,
        height: 4,
        backgroundColor: "#ccc",
        alignSelf: "center",
        borderRadius: 2,
        marginVertical: 10,
      }}
      // Allow dismissing the sheet by tapping on the backdrop
      closeOnTouchBackdrop={true}
    >
      <ScrollView style={globalStyles.actionSheet}>
        {exercise && (
          <>
          <View style={{borderRadius: 10, height: 250, width: 250, alignSelf: 'center', overflow: 'hidden'}}>
            <ExerciseGifImage
              style={{
                height: 250,
                width: '100%',
                alignSelf: 'center',
                marginBottom: 10,
              }}
              resizeMode="contain"
              url={exercise.gifUrl}
            />
            </View>
            {exercise.name && (
              <View style={{flexDirection:'row', alignItems: "baseline", marginBottom: 10}}>
              <Text
                style={[globalStyles.fontSizeExtraLarge, globalStyles.fontWeightSemiBold]}
              >
                {exercise.name} 
              </Text>
              <Text style={[globalStyles.fontSizeSmall, globalStyles.grayText, {marginLeft: 5}]}>
              #{exercise.id}
              </Text>
              </View>
            )}
            {/* Display extra data: target muscle group and secondary muscle groups */}
            {exercise.target && (
              <ScrollView
                horizontal
                style={{ marginBottom: 10 }}
                contentContainerStyle={{ alignItems: "center" }}
              >
                <Text
                  style={[
                    { marginBottom: 5, marginRight: 10 },
                    globalStyles.fontWeightBold,
                    globalStyles.fontSizeRegular,
                  ]}
                >
                  Target Muscle Group:
                </Text>
                <Text style={globalStyles.pill}>{exercise.target}</Text>
              </ScrollView>
            )}

            {exercise.secondary_muscle_groups &&
              Array.isArray(exercise.secondary_muscle_groups) && (
                <ScrollView
                  horizontal
                  style={{ marginBottom: 10 }}
                  contentContainerStyle={{ alignItems: "center" }}
                >
                  <Text
                    style={[
                      { marginBottom: 5, marginRight: 10 },
                      globalStyles.fontWeightBold,
                      globalStyles.fontSizeRegular,
                    ]}
                  >
                    Secondary Muscle Groups:
                  </Text>
                  {exercise.secondary_muscle_groups.map((muscle, index) => (
                    <Text
                      key={index}
                      style={[globalStyles.pill, { marginRight: 5 }]}
                    >
                      {muscle}
                    </Text>
                  ))}
                </ScrollView>
              )}
            {/* List the instructions */}
            {exercise.instructions && Array.isArray(exercise.instructions) ? (
              exercise.instructions.map((instruction, index) => (
                <Text key={index} style={[globalStyles.fontSizeRegular, { marginBottom: 10,}]}>
                  <Text style={globalStyles.fontWeightBold}>
                    Step {index + 1}:
                  </Text>{" "}
                  {instruction}
                </Text>
              ))
            ) : (
              <Text>No instructions available.</Text>
            )}
          </>
        )}
      </ScrollView>
    </ActionSheet>
  );
};

export default ExerciseSheet; 