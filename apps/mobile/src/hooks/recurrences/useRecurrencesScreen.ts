import { useCallback, useMemo, useState } from 'react'
import { useFocusEffect } from 'expo-router'
import type { Recurrence } from '@/components/finance/recurrences/types'
import { recurrenceQueries } from '@/services/database/repository/recurrence'
import { useRecurrencesStore } from '@/stores/recurrences'
import { mapLocalRecurrenceToListItem } from '@/utils/recurrences/mappers'

export function useRecurrencesScreen() {
  const [recurrences, setRecurrences] = useState<Recurrence[]>([])
  const [toast, setToast] = useState<string | null>(null)
  const [confirmedIds, setConfirmedIds] = useState<string[]>([])
  const [skippedIds, setSkippedIds] = useState<string[]>([])
  const consumePendingDeleteId = useRecurrencesStore((state) => state.consumePendingDeleteId)

  const loadRecurrences = useCallback(async () => {
    try {
      const data = await recurrenceQueries.getAll()
      setRecurrences(data.map(mapLocalRecurrenceToListItem))
    } catch (error) {
      console.error('Erro ao carregar recorrencias:', error)
    }
  }, [])

  useFocusEffect(
    useCallback(() => {
      void loadRecurrences()

      const id = consumePendingDeleteId()
      if (id) {
        void recurrenceQueries
          .delete(id)
          .then(() => {
            setRecurrences((prev) => prev.filter((r) => r.id !== id))
            setToast('Recorrência excluída com sucesso.')
          })
          .catch((error) => {
            console.error('Erro ao excluir recorrencia:', error)
            setToast('Não foi possível excluir a recorrência.')
          })
      }
    }, [consumePendingDeleteId, loadRecurrences]),
  )

  const totalMonthly = useMemo(
    () =>
      recurrences
        .filter((r) => r.isActive && r.frequency === 'MONTHLY')
        .reduce((sum, r) => (r.type === 'EXPENSE' ? sum + r.amount : sum - r.amount), 0),
    [recurrences],
  )

  const activeCount = useMemo(() => recurrences.filter((r) => r.isActive).length, [recurrences])

  const handleToggleActive = (id: string, isActive: boolean) => {
    setRecurrences((prev) => prev.map((r) => (r.id === id ? { ...r, isActive } : r)))
    void recurrenceQueries.update(id, { isActive }).catch((error) => {
      console.error('Erro ao atualizar recorrencia:', error)
      void loadRecurrences()
    })
  }

  const handleConfirmRecurrence = (id: string) => {
    setConfirmedIds((prev) => [...prev, id])
    setToast('Transação registrada com sucesso.')
  }

  const handleSkipRecurrence = (id: string) => {
    setSkippedIds((prev) => [...prev, id])
  }

  const handleUndoRecurrence = (id: string) => {
    setConfirmedIds((prev) => prev.filter((cid) => cid !== id))
    setSkippedIds((prev) => prev.filter((sid) => sid !== id))
  }

  return {
    recurrences,
    toast,
    setToast,
    confirmedIds,
    skippedIds,
    totalMonthly,
    activeCount,
    handleToggleActive,
    handleConfirmRecurrence,
    handleSkipRecurrence,
    handleUndoRecurrence,
  }
}
