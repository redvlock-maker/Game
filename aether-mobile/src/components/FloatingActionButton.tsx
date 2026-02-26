/**
 * FloatingActionButton.tsx
 * Purple pulsing FAB that opens the Editor for a new note.
 */

import React, { useRef } from 'react';
import { TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { Plus } from 'lucide-react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Colors, Radius } from '../utils/theme';
import type { RootStackParamList } from '../navigation/AppNavigator';

type NavProp = NativeStackNavigationProp<RootStackParamList>;

export default function FloatingActionButton() {
  const navigation = useNavigation<NavProp>();
  const scale = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 0.88, duration: 80, useNativeDriver: true }),
      Animated.timing(scale, { toValue: 1, duration: 80, useNativeDriver: true }),
    ]).start();
    navigation.navigate('Editor', undefined);
  };

  return (
    <Animated.View style={[styles.wrapper, { transform: [{ scale }] }]}>
      <TouchableOpacity style={styles.btn} onPress={handlePress} activeOpacity={0.85}>
        <Plus color="#fff" size={28} strokeWidth={2.5} />
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    shadowColor: Colors.accent,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.5,
    shadowRadius: 12,
    elevation: 8,
  },
  btn: {
    width: 58,
    height: 58,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
