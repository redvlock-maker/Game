import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Home, Search, GitBranch } from 'lucide-react-native';

import HomeScreen from '../screens/HomeScreen';
import SearchScreen from '../screens/SearchScreen';
import GraphScreen from '../screens/GraphScreen';
import EditorScreen from '../screens/EditorScreen';
import { Colors } from '../utils/theme';

// ─── Param Lists ────────────────────────────────────────────────────────────
export type RootStackParamList = {
  MainTabs: undefined;
  Editor: { noteId?: string; title?: string } | undefined;
};

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Graph: undefined;
};

// ─── Navigators ──────────────────────────────────────────────────────────────
const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

function TabNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: Colors.surface,
          borderTopColor: Colors.border,
          borderTopWidth: 1,
          height: 60,
          paddingBottom: 8,
        },
        tabBarActiveTintColor: Colors.accentLight,
        tabBarInactiveTintColor: Colors.textMuted,
        tabBarLabelStyle: { fontSize: 11 },
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Home color={color} size={size} />,
          tabBarLabel: 'Notes',
        }}
      />
      <Tab.Screen
        name="Search"
        component={SearchScreen}
        options={{
          tabBarIcon: ({ color, size }) => <Search color={color} size={size} />,
          tabBarLabel: 'Search',
        }}
      />
      <Tab.Screen
        name="Graph"
        component={GraphScreen}
        options={{
          tabBarIcon: ({ color, size }) => <GitBranch color={color} size={size} />,
          tabBarLabel: 'Graph',
        }}
      />
    </Tab.Navigator>
  );
}

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.bg },
          animation: 'slide_from_right',
        }}
      >
        <Stack.Screen name="MainTabs" component={TabNavigator} />
        <Stack.Screen
          name="Editor"
          component={EditorScreen}
          options={{ animation: 'slide_from_bottom' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
