import { ThemedContainer } from '@/components/ui/ThemedContainer'
import { ThemedText } from '@/components/ui/ThemedText'
import { Pressable, View } from 'react-native'
import Fontisto from '@expo/vector-icons/Fontisto'
import { SectionDivider } from '@/components/ui/SectionDivider'
import { styles } from './style'
import { router } from 'expo-router'
import { resolveTextTone } from '@/utils/textTone'
import { useThemeColor } from '@/hooks/useThemeColor'
import { ProgressBar } from '../ProgressBar'
import { formatCurrency } from '@/utils/formatters'
import { useState } from 'react'
import { ThemedOverlayAlert } from '@/components/ui/ThemedOverlayAlert'
import { budgetQueries } from '@/services/database/repository/budget'

type props = {
  id: string
  categoryId: string
  amountLimit: number
  name: string
  month: number
  year: number
  totalValue?: number
  spentValue?: number
  onDelete?: (id: string) => void
}

export function BudgetItem({
  id,
  amountLimit,
  name,
  totalValue = amountLimit / 100,
  spentValue = 0,
  onDelete,
}: props) {
  const colors = useThemeColor()
  const remainingValue = totalValue - spentValue
  const fillPercentage = Math.round((spentValue / totalValue) * 100)
  const formatedTotalValue = formatCurrency(totalValue)
  const formatedSpentValue = formatCurrency(spentValue)
  const formatedRemainingValue = formatCurrency(remainingValue)
  const safePercentage = Math.min(100, fillPercentage)
  const [showAction, setShowAction] = useState(false)
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null)

  return (
    <ThemedContainer style={{ padding: 20 }}>
      <View style={styles.container}>
        <ThemedText children text={name} variant="title" />
        <View style={styles.actionContainer}>
          <Pressable
            onPress={() => {
              setShowAction((prev) => !prev)
            }}
            style={styles.iconButton}
          >
            <Fontisto name="more-v-a" size={24} color={resolveTextTone(colors, 'muted')} />
          </Pressable>
          {showAction ? (
            <View style={[styles.dropdownMenu, { backgroundColor: colors.surfaceMuted }]}>
              <Pressable
                onPress={() => {
                  router.push(`/(budget)/${id}`)
                  setShowAction(false)
                }}
                style={styles.menuItem}
              >
                <ThemedText text="Editar" />
              </Pressable>

              <SectionDivider />

              <Pressable
                onPress={() => setFeedbackMessage('Você tem certeza que deseja excluir esse item?')}
                style={styles.menuItem}
              >
                <ThemedText text="Excluir" />
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>
      <View style={styles.container}>
        <ThemedText children variant="display" text={`${formatedTotalValue}`} />
        <ThemedText children variant="display" text={`${safePercentage}%`} />
      </View>
      <ProgressBar percentage={safePercentage} backColor="blue" fillColor="green" />
      <View style={styles.container}>
        {remainingValue > 0 ? (
          <ThemedText children variant="label" tone="muted" text={`${formatedSpentValue} gastos`} />
        ) : null}
        <ThemedText
          children
          variant="label"
          tone={remainingValue > 0 ? 'default' : 'warning'}
          text={`${formatedRemainingValue} ${remainingValue > 0 ? 'sobrando' : 'além do limite'}`}
        />
      </View>
      <ThemedOverlayAlert
        visible={feedbackMessage != null}
        onRequestClose={() => setFeedbackMessage(null)}
        message={feedbackMessage ?? ''}
        actions={[
          { label: 'Cancelar', onPress: () => setFeedbackMessage(null) },
          {
            label: 'Confirmar',
            onPress: async () => {
              try {
                await budgetQueries.delete(id)
                setFeedbackMessage(null)
                onDelete?.(id)
              } catch (deleteError) {
                console.error('Erro ao excluir orçamento:', deleteError)
                setFeedbackMessage('Não foi possível excluir o orçamento. Tente novamente.')
              }
            },
          },
        ]}
      >
        <ThemedText children text="" />
      </ThemedOverlayAlert>
    </ThemedContainer>
  )
}
