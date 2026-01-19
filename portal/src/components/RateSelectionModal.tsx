'use client'

import { useState } from 'react'
import {
  X,
  Loader2,
  Truck,
  Clock,
  DollarSign,
  AlertTriangle,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

interface ServiceTotal {
  serviceCode: string
  carrierId: string
  carrierName: string
  serviceName: string
  totalCost: number
  avgCost: number
  deliveryDays?: number
}

interface ShipmentRate {
  shipmentId: string
  orderNumber: string | null
  subscriberName: string
  weight: number
  rates: Array<{
    rate_id: string
    carrier_friendly_name: string
    service_type: string
    service_code: string
    shipping_amount: { currency: string; amount: number }
    delivery_days?: number
    estimated_delivery_date?: string
  }>
  error?: string
}

interface RateSelectionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (carrierId: string, serviceCode: string, saveAsDefault: boolean) => void
  shipmentCount: number
  commonServices: ServiceTotal[]
  shipmentRates: ShipmentRate[]
  isLoading: boolean
  isPurchasing: boolean
  error?: string
}

export default function RateSelectionModal({
  isOpen,
  onClose,
  onConfirm,
  shipmentCount,
  commonServices,
  shipmentRates,
  isLoading,
  isPurchasing,
  error,
}: RateSelectionModalProps) {
  const [selectedService, setSelectedService] = useState<ServiceTotal | null>(null)
  const [saveAsDefault, setSaveAsDefault] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  if (!isOpen) return null

  const shipmentsWithErrors = shipmentRates.filter(sr => sr.error)
  const shipmentsWithRates = shipmentRates.filter(sr => !sr.error && sr.rates.length > 0)

  const handleConfirm = () => {
    if (!selectedService) return

    // Use the carrierId from the selected service (already populated from rates)
    onConfirm(selectedService.carrierId, selectedService.serviceCode, saveAsDefault)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[#1a1a1a] rounded-2xl border border-[rgba(255,255,255,0.1)] w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-[rgba(255,255,255,0.06)]">
          <div>
            <h2 className="text-xl font-semibold text-white">Select Shipping Rate</h2>
            <p className="text-sm text-[#71717a] mt-1">
              {shipmentCount} shipment{shipmentCount !== 1 ? 's' : ''} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-[#71717a] hover:text-white hover:bg-[rgba(255,255,255,0.05)] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-[#e07a42] animate-spin mb-4" />
              <p className="text-[#a1a1aa]">Fetching rates from ShipStation...</p>
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400" />
                <p className="text-red-400">{error}</p>
              </div>
            </div>
          ) : (
            <>
              {/* Errors warning */}
              {shipmentsWithErrors.length > 0 && (
                <div className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-400" />
                    <div>
                      <p className="text-yellow-400 font-medium">
                        {shipmentsWithErrors.length} shipment{shipmentsWithErrors.length !== 1 ? 's' : ''} could not be rated
                      </p>
                      <p className="text-sm text-[#a1a1aa] mt-1">
                        These will be skipped. Common issues: missing address, unsupported destination.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Rate options */}
              {commonServices.length === 0 ? (
                <div className="text-center py-12">
                  <Truck className="w-12 h-12 text-[#52525b] mx-auto mb-4" />
                  <p className="text-[#a1a1aa]">No common shipping services available for all shipments</p>
                  <p className="text-sm text-[#52525b] mt-2">
                    Try selecting fewer shipments or check for address issues
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-[#71717a] mb-4">
                    Services available for all {shipmentsWithRates.length} shipments:
                  </p>

                  {commonServices.map((service) => {
                    const isSelected = selectedService?.serviceCode === service.serviceCode
                    return (
                      <button
                        key={service.serviceCode}
                        onClick={() => setSelectedService(service)}
                        className={`w-full p-4 rounded-xl border transition-all text-left ${
                          isSelected
                            ? 'border-[#e07a42] bg-[#e07a42]/10'
                            : 'border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:bg-[rgba(255,255,255,0.04)]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? 'border-[#e07a42] bg-[#e07a42]' : 'border-[#52525b]'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div>
                              <p className="text-white font-medium">{service.carrierName}</p>
                              <p className="text-sm text-[#a1a1aa]">{service.serviceName}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-white font-semibold">
                              ${service.totalCost.toFixed(2)}
                            </p>
                            <p className="text-xs text-[#71717a]">
                              ~${service.avgCost.toFixed(2)} avg/label
                            </p>
                          </div>
                        </div>

                        {service.deliveryDays && (
                          <div className="flex items-center gap-2 mt-3 text-sm text-[#71717a]">
                            <Clock className="w-4 h-4" />
                            <span>{service.deliveryDays} business day{service.deliveryDays !== 1 ? 's' : ''}</span>
                          </div>
                        )}
                      </button>
                    )
                  })}
                </div>
              )}

              {/* Expand details */}
              {shipmentsWithRates.length > 0 && (
                <button
                  onClick={() => setShowDetails(!showDetails)}
                  className="flex items-center gap-2 mt-6 text-sm text-[#71717a] hover:text-white transition-colors"
                >
                  {showDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  {showDetails ? 'Hide' : 'Show'} individual shipment rates
                </button>
              )}

              {showDetails && (
                <div className="mt-4 space-y-4">
                  {shipmentRates.map((sr) => (
                    <div
                      key={sr.shipmentId}
                      className="p-4 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(255,255,255,0.06)]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-white font-medium">{sr.subscriberName}</p>
                          <p className="text-xs text-[#71717a]">{sr.orderNumber || sr.shipmentId.slice(0, 8)}</p>
                        </div>
                        <span className="text-sm text-[#71717a]">{sr.weight} oz</span>
                      </div>

                      {sr.error ? (
                        <div className="flex items-center gap-2 text-sm text-red-400">
                          <AlertTriangle className="w-4 h-4" />
                          <span>{sr.error}</span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-2">
                          {sr.rates.slice(0, 4).map((rate) => (
                            <div
                              key={rate.rate_id}
                              className={`p-2 rounded-lg text-xs ${
                                selectedService?.serviceCode === rate.service_code
                                  ? 'bg-[#e07a42]/10 border border-[#e07a42]/30'
                                  : 'bg-[rgba(255,255,255,0.02)]'
                              }`}
                            >
                              <p className="text-[#a1a1aa]">{rate.service_type}</p>
                              <p className="text-white font-medium">${rate.shipping_amount.amount.toFixed(2)}</p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-[rgba(255,255,255,0.06)] p-6">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={saveAsDefault}
                onChange={(e) => setSaveAsDefault(e.target.checked)}
                className="w-4 h-4 rounded border-[#52525b] bg-transparent text-[#e07a42] focus:ring-[#e07a42] focus:ring-offset-0"
              />
              <span className="text-sm text-[#a1a1aa]">Save as default service</span>
            </label>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-[rgba(255,255,255,0.05)] text-white font-medium hover:bg-[rgba(255,255,255,0.1)] transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedService || isPurchasing || isLoading}
                className="px-6 py-2 rounded-lg bg-[#e07a42] text-white font-semibold hover:bg-[#c86a35] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isPurchasing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Purchasing...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4" />
                    Buy Labels {selectedService && `($${selectedService.totalCost.toFixed(2)})`}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
