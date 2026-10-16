import { ThemedBackground } from '@/components/ui/ThemedBackground'
import { ThemedText } from '@/components/ui/ThemedText'
import { useHomeScreen } from '@/hooks/home/useHomeScreen'
import { spacing } from '@/utils/dimensions'
import { StyleSheet, View } from 'react-native'

export default function HomeScreen() {
  const { greeting, subtitle } = useHomeScreen()

  return (
    <ThemedBackground style={styles.screen}>
      <View style={styles.content}>
        <ThemedText variant="headline" text={greeting} />
        <ThemedText variant="body" text={subtitle} tone="muted" />
      </View>
    </ThemedBackground>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  content: {
    gap: spacing.sm,
  },
})
