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
      <div className="relative bg-background-surface rounded-2xl border border-border-strong w-full max-w-3xl max-h-[85vh] overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div>
            <h2 className="text-xl font-semibold text-foreground">Select Shipping Rate</h2>
            <p className="text-sm text-foreground-muted mt-1">
              {shipmentCount} shipment{shipmentCount !== 1 ? 's' : ''} selected
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-foreground-muted hover:text-foreground hover:bg-background-elevated transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12">
              <Loader2 className="w-8 h-8 text-accent animate-spin mb-4" />
              <p className="text-foreground-tertiary">Fetching rates from ShipStation...</p>
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
                      <p className="text-sm text-foreground-tertiary mt-1">
                        These will be skipped. Common issues: missing address, unsupported destination.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Rate options */}
              {commonServices.length === 0 ? (
                <div className="text-center py-12">
                  <Truck className="w-12 h-12 text-foreground-tertiary mx-auto mb-4" />
                  <p className="text-foreground-tertiary">No common shipping services available for all shipments</p>
                  <p className="text-sm text-foreground-muted mt-2">
                    Try selecting fewer shipments or check for address issues
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-foreground-muted mb-4">
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
                            ? 'border-accent bg-accent/10'
                            : 'border-border bg-background-secondary hover:bg-background-elevated'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div
                              className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                                isSelected ? 'border-accent bg-accent' : 'border-foreground-muted'
                              }`}
                            >
                              {isSelected && <Check className="w-3 h-3 text-white" />}
                            </div>
                            <div>
                              <p className="text-foreground font-medium">{service.carrierName}</p>
                              <p className="text-sm text-foreground-tertiary">{service.serviceName}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-foreground font-semibold">
                              ${service.totalCost.toFixed(2)}
                            </p>
                            <p className="text-xs text-foreground-muted">
                              ~${service.avgCost.toFixed(2)} avg/label
                            </p>
                          </div>
                        </div>

                        {service.deliveryDays && (
                          <div className="flex items-center gap-2 mt-3 text-sm text-foreground-muted">
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
                  className="flex items-center gap-2 mt-6 text-sm text-foreground-muted hover:text-foreground transition-colors"
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
                      className="p-4 rounded-xl bg-background-secondary border border-border"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="text-foreground font-medium">{sr.subscriberName}</p>
                          <p className="text-xs text-foreground-muted">{sr.orderNumber || sr.shipmentId.slice(0, 8)}</p>
                        </div>
                        <span className="text-sm text-foreground-muted">{sr.weight} oz</span>
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
                                  ? 'bg-accent/10 border border-accent/30'
                                  : 'bg-background-elevated'
                              }`}
                            >
                              <p className="text-foreground-tertiary">{rate.service_type}</p>
                              <p className="text-foreground font-medium">${rate.shipping_amount.amount.toFixed(2)}</p>
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
        <div className="border-t border-border p-6">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={saveAsDefault}
                onChange={(e) => setSaveAsDefault(e.target.checked)}
                className="w-4 h-4 rounded border-foreground-muted bg-transparent text-accent focus:ring-accent focus:ring-offset-0"
              />
              <span className="text-sm text-foreground-tertiary">Save as default service</span>
            </label>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg bg-background-elevated text-foreground font-medium hover:bg-background-secondary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirm}
                disabled={!selectedService || isPurchasing || isLoading}
                className="px-6 py-2 rounded-lg bg-accent text-white font-semibold hover:bg-accent-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
