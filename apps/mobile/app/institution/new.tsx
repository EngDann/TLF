import { InstitutionForm } from '@/components/finance/institutions/InstitutionForm'
import { useNewInstitution } from '@/hooks/institutions/useNewInstitution'

export default function NewInstitutionScreen() {
  const {
    name,
    setName,
    color,
    icon,
    nameError,
    isFormValid,
    isSaving,
    showSuccess,
    previewName,
    validateName,
    openAppearance,
    handleSave,
    handleClose,
  } = useNewInstitution()

  return (
    <InstitutionForm
      title="Nova Instituição"
      submitLabel="Adicionar Instituição"
      name={name}
      onNameChange={setName}
      onNameBlur={() => validateName(name)}
      color={color}
      icon={icon}
      previewName={previewName}
      nameError={nameError}
      submitDisabled={!isFormValid || isSaving}
      successVisible={showSuccess}
      successMessage="Instituição criada com sucesso."
      onOpenAppearance={openAppearance}
      onSubmit={handleSave}
      onClose={handleClose}
    />
  )
}
