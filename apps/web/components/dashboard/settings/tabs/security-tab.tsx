import type { ActivityFeedEntry } from '@/lib/api'
import { PinSetupCard } from '@/components/dashboard/settings/components/pin-setup-card'

type SecurityTabProps = Readonly<{
  activity: ActivityFeedEntry[]
  activityError: string | null
  activityLoading: boolean
}>

export function SecurityTab({ activity, activityError, activityLoading }: SecurityTabProps) {
  return <PinSetupCard activity={activity} activityError={activityError} activityLoading={activityLoading} />
}
