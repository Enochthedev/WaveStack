import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

type IoniconName = React.ComponentProps<typeof Ionicons>["name"];

function TabIcon({
  name,
  focused,
}: {
  name: IoniconName;
  focused: boolean;
}) {
  return (
    <Ionicons
      name={focused ? name : (`${name}-outline` as IoniconName)}
      size={24}
      color={focused ? "#7c3aed" : "#6b7280"}
    />
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: "#0a0a0f" },
        headerTitleStyle: { color: "#ffffff", fontWeight: "600" },
        tabBarStyle: {
          backgroundColor: "#0f0f1a",
          borderTopColor: "#1f1f2e",
          paddingBottom: 6,
          height: 60,
        },
        tabBarActiveTintColor: "#7c3aed",
        tabBarInactiveTintColor: "#6b7280",
      }}
    >
      <Tabs.Screen
        name="dashboard"
        options={{
          title: "Dashboard",
          tabBarIcon: ({ focused }) => <TabIcon name="home" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="approvals"
        options={{
          title: "Approvals",
          tabBarIcon: ({ focused }) => <TabIcon name="checkmark-circle" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="stream"
        options={{
          title: "Stream",
          tabBarIcon: ({ focused }) => <TabIcon name="radio" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="brief"
        options={{
          title: "Brief",
          tabBarIcon: ({ focused }) => <TabIcon name="newspaper" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "Settings",
          tabBarIcon: ({ focused }) => <TabIcon name="settings" focused={focused} />,
        }}
      />
    </Tabs>
  );
}
