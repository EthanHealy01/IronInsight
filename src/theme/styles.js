import { useColorScheme } from 'react-native';

export const styles = () => {
    const isDarkMode = useColorScheme() === 'dark';

    return {
        // Flexbox Utilities
        container: {
            flex: 1,
            backgroundColor: isDarkMode ? '#232323' : '#F5F5F5',
        },
        card: {
            borderRadius: 10,
            padding: 10,
            backgroundColor: isDarkMode ? '#000000' : '#FFFFFF',
        },
        flexRow: {
            flexDirection: 'row',
            display: 'flex',
            alignItems: 'center',
        },
        flexRowAround: {
            flexDirection: 'row',
            display: 'flex',
            justifyContent: 'space-around',
            alignItems: 'center',
        },
        flexRowBetween: {
            flexDirection: 'row',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
        },
        flexRowCenter: {
            flexDirection: 'row',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
        },
        flexRowWrap: {
            flexDirection: 'row',
            display: 'flex',
            flexWrap: 'wrap',
        },
        flexColumn: {
            flexDirection: 'column',
            display: 'flex',
        },

        // Text Styles
        fontWeightBold: {
            fontWeight: 'bold',
            color: isDarkMode ? '#FFFFFF' : '#000000',
        },
        fontWeightSemiBold: {
            fontWeight: '600',
            color: isDarkMode ? '#FFFFFF' : '#000000',
        },
        fontWeightRegular: {
            fontWeight: '500',
            color: isDarkMode ? '#FFFFFF' : '#000000',
        },
        fontWeightLight: {
            fontWeight: '300',
            color: isDarkMode ? '#FFFFFF' : '#000000',

        },
        fontWeightExtraLight: {
            fontWeight: '200',
            color: isDarkMode ? '#FFFFFF' : '#000000',
        },
        fontSizeSmall: {
            fontSize: 12,
            color: isDarkMode ? '#FFFFFF' : '#000000',
        },
        fontSizeRegular: {
            fontSize: 14,
            color: isDarkMode ? '#FFFFFF' : '#000000',
        },
        fontSizeMedium: {
            fontSize: 16,
            color: isDarkMode ? '#FFFFFF' : '#000000',
        },
        fontSizeLarge: {
            fontSize: 20,
            color: isDarkMode ? '#FFFFFF' : '#000000',
        },
        fontSizeExtraLarge: {
            fontSize: 24,
            color: isDarkMode ? '#FFFFFF' : '#000000',
        },
        fontSizeExtraExtraLarge: {
            fontSize: 28,
            color: isDarkMode ? '#FFFFFF' : '#000000',
        },
        textCenter: {
            textAlign: 'center',
            color: isDarkMode ? '#FFFFFF' : '#000000',
        },
        textLeft: {
            textAlign: 'left',
            color: isDarkMode ? '#FFFFFF' : '#000000',
        },
        textRight: {
            textAlign: 'right',
            color: isDarkMode ? '#FFFFFF' : '#000000',
        },
        grayText: {
            color: isDarkMode ? '#FFFFFF' : '#8e8e93',
        },

        // Root Padding
        root: {
            flex: 1,
        },
        backgroundColor: {
            flex:1,
            backgroundColor: isDarkMode ? '#232323' : '#F5F5F5',
        },
        cardBackgroundColor: {
            backgroundColor: isDarkMode ? '#111111' : '#FFFFFF',
        },

        // Tab Bar Styles
        tabBarContainer: {
            position: 'absolute',
            bottom: 0,
            flexDirection: 'row',
            backgroundColor: isDarkMode ? '#1C1C1C' : 'white',
            marginHorizontal: 15,
            padding: 15,
            borderRadius: 100,
            shadowColor: isDarkMode ? 'transparent' : '#777676',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5, 
        },
        tabItem: {
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
        },
        tabText: {
            fontSize: 12,
            color: '#8e8e93',
            marginTop: 2,
        },
        focusedText: {
            color: '#007AFF',
            fontWeight: 'bold',
        },
        primary: {
            color: '#EB9848',
        },
        pill: {
            backgroundColor: '#EB9848',
            padding: 5,
            borderRadius: 10,
            marginRight: 5,
            marginBottom: 5,
            color: 'white',
            fontSize: 10,
            maxHeight: 25,
            fontWeight: 'bold',
        },
        easyDifficultyPill: {
            backgroundColor: '#04CE00',
            padding: 5,
            borderRadius: 10,
            marginRight: 5,
            marginBottom: 5,
            color: 'white',
            fontSize: 8,
            maxHeight: 25,
            fontWeight: 'bold',
        },
        mediumDifficultyPill: {
            backgroundColor: '#FF7700',
            padding: 5,
            borderRadius: 10,
            marginRight: 5,
            marginBottom: 5,
            color: 'white',
            fontSize: 8,
            maxHeight: 25,
            fontWeight: 'bold',
        },
        advancedDifficultyPill: {
            backgroundColor: '#FF3B30',
            padding: 5,
            borderRadius: 10,
            marginRight: 5,
            marginBottom: 5,
            color: 'white',
            fontSize: 8,
            maxHeight: 25,
            fontWeight: 'bold',
        },
        exploreCard: {
            borderRadius: 10,
            padding: 10,
            marginBottom: 10,
            backgroundColor: isDarkMode ? '#111111' : '#FFFFFF',
        },
        searchBar: {
            backgroundColor: isDarkMode ? '#111111' : '#FFFFFF',
            borderRadius: 10,
            padding: 10,
            marginBottom: 10,
        },
        searchBarPlaceholder: {
            color: isDarkMode ? '#FFFFFF' : '#8e8e93',
        },
        primaryColor: {
            backgroundColor: '#EB9848',
        },
        secondaryColor: {
            backgroundColor: "#748CA3"
        },

        // Modal Styles
        modalContainer: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: 20,
            backgroundColor: isDarkMode
                ? 'rgba(0,0,0,0.9)'
                : 'rgba(255,255,255,0.9)',
        },
        modalContent: {
            width: '100%',
            borderRadius: 15,
            padding: 20,
            maxHeight: '80%',
            shadowColor: isDarkMode ? '#000000' : '#000000',
            backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
        },
        metricItem: {
            borderRadius: 8,
            marginBottom: 10,
        },
        
        // Input Styles
        input: {
            borderWidth: 1,
            borderColor: isDarkMode ? '#333333' : '#E5E5E5',
            borderRadius: 8,
            padding: 10,
            color: isDarkMode ? '#FFFFFF' : '#000000',
            backgroundColor: isDarkMode ? '#1C1C1E' : '#FFFFFF',
        },
        
        // Button Styles
        primaryButton: {
            backgroundColor: '#EB9848',
            borderRadius: 25,
            padding: 15,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: isDarkMode ? 'transparent' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
        },
        secondaryButton: {
            backgroundColor: '#748CA3',
            borderRadius: 25,
            padding: 15,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: isDarkMode ? 'transparent' : '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
        },
        buttonText: {
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: '600',
        },
        button: {
            backgroundColor: '#007AFF',
            borderRadius: 8,
            padding: 15,
            alignItems: 'center',
            justifyContent: 'center',
        },
        buttonText: {
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: '600',
        },
        typeButton: {
            padding: 10,
            borderRadius: 8,
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: isDarkMode ? '#333333' : '#E5E5E5',
        },
        typeButtonActive: {
            backgroundColor: '#007AFF',
            borderColor: '#007AFF',
        },
        primaryButton: {
            backgroundColor: '#EB9848',
            borderRadius:10,
            padding: 0,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical:10,
        },
        secondaryButton: {
            backgroundColor: '#748CA3',
            borderRadius:10,
            padding: 0,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical:10
        },
        dangerButton: {
            backgroundColor: '#FF3B30',
            borderRadius:10,
            padding: 0,
            alignItems: 'center',
            justifyContent: 'center',
            paddingVertical:10
        },
        buttonText: {
            color: '#FFFFFF',
            fontSize: 16,
            fontWeight: '600',
        },  
        workoutCard: {
            backgroundColor: isDarkMode ? "#000000" : "#FFFFFF",
            borderRadius: 10
        },
        modalTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: isDarkMode ? '#FFFFFF' : '#000000',
        }
    };
};
