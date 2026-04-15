import RaiseMaterialRequestModal from '@/components/dashboard/RaiseMaterialRequestModal'
import type { WODetail, ProfileWarehouses } from '@/types'

interface Props {
  open: boolean
  wo: WODetail
  warehouses: ProfileWarehouses
  onClose: () => void
  onDone: () => void
  powProfileName?: string | null
}

export default function WORequestMaterialsModal({ open, wo, warehouses, onClose, onDone, powProfileName }: Props) {
  return (
    <RaiseMaterialRequestModal
      open={open}
      onClose={onClose}
      warehouses={warehouses}
      defaultWarehouse={null}
      powProfileName={powProfileName}
      woContext={wo}
      onDone={onDone}
    />
  )
}
