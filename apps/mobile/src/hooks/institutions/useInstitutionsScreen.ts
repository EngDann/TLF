import { useCallback, useEffect, useMemo, useState } from 'react'
import { router } from 'expo-router'
import type { InstitutionListItem } from '@/components/finance/institutions/types'
import { institutionQueries } from '@/services/database/repository/institution'
import { useInstitutionsStore } from '@/stores/institutions'
import { mapLocalInstitutionToListItem } from '@/utils/institutions/institutionMappers'

export function useInstitutionsScreen() {
  const institutions = useInstitutionsStore((state) => state.institutions)
  const setInstitutions = useInstitutionsStore((state) => state.setInstitutions)
  const removeInstitution = useInstitutionsStore((state) => state.removeInstitution)

  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)
  const [blockedVisible, setBlockedVisible] = useState(false)

  useEffect(() => {
    let isActive = true

    const loadInstitutions = async () => {
      try {
        setIsLoading(true)
        const localData = await institutionQueries.getAll()
        if (!isActive) return
        setInstitutions(localData.map(mapLocalInstitutionToListItem))
        setError(null)
      } catch (localError) {
        if (!isActive) return
        console.error('Erro ao carregar instituicoes locais:', localError)
        setError('Nao foi possivel carregar as instituicoes.')
      } finally {
        if (isActive) setIsLoading(false)
      }
    }

    loadInstitutions()

    return () => {
      isActive = false
    }
  }, [setInstitutions])

  const toggleSearch = useCallback(() => {
    setIsSearchOpen((prev) => {
      if (prev) setSearchQuery('')
      return !prev
    })
  }, [])

  const handleOpen = useCallback((institution: InstitutionListItem) => {
    router.push({
      pathname: '/institution/[id]',
      params: {
        id: institution.id,
        name: institution.name,
        color: institution.color,
        icon: institution.icon ?? '',
      },
    })
  }, [])

  const handleCreate = useCallback(() => {
    router.push('/institution/new')
  }, [])

  const performDelete = useCallback(
    async (institutionId: string) => {
      try {
        await institutionQueries.delete(institutionId)
        removeInstitution(institutionId)
        setError(null)
      } catch (deleteError) {
        console.error('Erro ao excluir instituicao:', deleteError)
        setError('Nao foi possivel excluir a instituicao.')
      }
    },
    [removeInstitution],
  )

  const handleDelete = useCallback(
    (institutionId: string) => {
      const institution = institutions.find((item) => item.id === institutionId)
      if (institution && (institution.accountsCount ?? 0) > 0) {
        setBlockedVisible(true)
        return
      }
      setPendingDeleteId(institutionId)
    },
    [institutions],
  )

  const confirmDelete = useCallback(() => {
    if (pendingDeleteId) void performDelete(pendingDeleteId)
    setPendingDeleteId(null)
  }, [pendingDeleteId, performDelete])

  const cancelDelete = useCallback(() => setPendingDeleteId(null), [])
  const dismissBlocked = useCallback(() => setBlockedVisible(false), [])

  const filteredInstitutions = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    if (!query) return institutions
    return institutions.filter((institution) => institution.name.toLowerCase().includes(query))
  }, [institutions, searchQuery])

  return {
    institutions: filteredInstitutions,
    isLoading,
    error,
    searchQuery,
    setSearchQuery,
    isSearchOpen,
    toggleSearch,
    handleOpen,
    handleCreate,
    handleDelete,
    confirmVisible: pendingDeleteId != null,
    confirmDelete,
    cancelDelete,
    blockedVisible,
    dismissBlocked,
  }
}
