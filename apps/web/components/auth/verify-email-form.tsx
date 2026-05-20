'use client'

import { useRouter } from 'next/navigation'
import {
  type Dispatch,
  type FormEvent,
  type SetStateAction,
  useCallback,
  useMemo,
  useState,
  useTransition,
} from 'react'
import { useMutation } from '@tanstack/react-query'
import { useForm, type UseFormGetValues, type UseFormHandleSubmit } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ApiError, requestEmailVerification, verifyEmail } from '@/lib/api'
import { type VerifyEmailFormValues, verifyEmailSchema } from '@/lib/validation'
import {
  VerifyEmailCodeForm,
  VerifyEmailFooter,
  VerifyEmailHeader,
  VerifyEmailInboxState,
} from './verify-email-form.view'

type VerifyEmailFormProps = Readonly<{
  email?: string
  firstAccess?: boolean
  successRedirectTo?: string
}>

export function VerifyEmailForm({ email, firstAccess, successRedirectTo = '/login' }: VerifyEmailFormProps) {
  const controller = useVerifyEmailController({ email, firstAccess, successRedirectTo })

  if (controller.showCheckInbox) {
    return <VerifyEmailInboxState email={email} onCodeEntry={controller.onCodeEntry} />
  }

  return (
    <div>
      <VerifyEmailHeader />
      <VerifyEmailCodeForm
        errors={controller.errors}
        isResending={controller.isResending}
        isVerifying={controller.isVerifying}
        register={controller.register}
        statusMessage={controller.statusMessage}
        successMessage={controller.successMessage}
        onResend={controller.onResend}
        onSubmit={controller.onSubmit}
      />
      <VerifyEmailFooter />
    </div>
  )
}

function useVerifyEmailController({
  email,
  firstAccess,
  successRedirectTo,
}: VerifyEmailFormProps & { successRedirectTo: string }) {
  const router = useRouter()
  const [isRouting, startTransition] = useTransition()
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  const [showCheckInbox, setShowCheckInbox] = useState(Boolean(firstAccess))
  const {
    register,
    handleSubmit,
    getValues,
    formState: { errors },
  } = useForm<VerifyEmailFormValues>({
    resolver: zodResolver(verifyEmailSchema),
    defaultValues: {
      email: email ?? '',
      code: '',
    },
  })
  const verifyMutation = useVerifyEmailMutation({ router, setSuccessMessage, startTransition, successRedirectTo })
  const resendMutation = useResendEmailMutation(setSuccessMessage)
  const handlers = useVerifyEmailHandlers({
    getValues,
    handleSubmit,
    resendVerification: resendMutation.mutate,
    setShowCheckInbox,
    setSuccessMessage,
    verifyEmailCode: verifyMutation.mutate,
  })

  return {
    errors,
    isResending: resendMutation.isPending,
    isVerifying: verifyMutation.isPending || isRouting,
    register,
    showCheckInbox,
    statusMessage: resolveVerifyEmailStatusMessage(verifyMutation.error, resendMutation.error),
    successMessage,
    ...handlers,
  }
}

function useVerifyEmailMutation({
  router,
  setSuccessMessage,
  startTransition,
  successRedirectTo,
}: {
  router: ReturnType<typeof useRouter>
  setSuccessMessage: Dispatch<SetStateAction<string | null>>
  startTransition: ReturnType<typeof useTransition>[1]
  successRedirectTo: string
}) {
  return useMutation({
    mutationFn: verifyEmail,
    onSuccess: (payload) => {
      setSuccessMessage(payload.message)
      startTransition(() => {
        router.push(successRedirectTo)
      })
    },
  })
}

function useResendEmailMutation(setSuccessMessage: Dispatch<SetStateAction<string | null>>) {
  return useMutation({
    mutationFn: requestEmailVerification,
    onSuccess: (payload) => {
      setSuccessMessage(payload.message)
    },
  })
}

function useVerifyEmailHandlers({
  getValues,
  handleSubmit,
  resendVerification,
  setShowCheckInbox,
  setSuccessMessage,
  verifyEmailCode,
}: {
  getValues: UseFormGetValues<VerifyEmailFormValues>
  handleSubmit: UseFormHandleSubmit<VerifyEmailFormValues>
  resendVerification: (values: { email: string }) => void
  setShowCheckInbox: Dispatch<SetStateAction<boolean>>
  setSuccessMessage: Dispatch<SetStateAction<string | null>>
  verifyEmailCode: (values: VerifyEmailFormValues) => void
}) {
  const submitValues = useCallback(
    (values: VerifyEmailFormValues) => {
      setSuccessMessage(null)
      verifyEmailCode(values)
    },
    [setSuccessMessage, verifyEmailCode],
  )
  const submitHandler = useMemo(() => handleSubmit(submitValues), [handleSubmit, submitValues])
  const onCodeEntry = useCallback(() => setShowCheckInbox(false), [setShowCheckInbox])
  const onResend = useResendHandler(getValues, resendVerification, setSuccessMessage)
  const onSubmit = useSubmitHandler(submitHandler)

  return {
    onCodeEntry,
    onResend,
    onSubmit,
  }
}

function useSubmitHandler(submitHandler: (event: FormEvent<HTMLFormElement>) => Promise<void>) {
  return useCallback(
    (event: FormEvent<HTMLFormElement>) => {
      void submitHandler(event)
    },
    [submitHandler],
  )
}

function useResendHandler(
  getValues: UseFormGetValues<VerifyEmailFormValues>,
  resendVerification: (values: { email: string }) => void,
  setSuccessMessage: Dispatch<SetStateAction<string | null>>,
) {
  return useCallback(() => {
    const currentEmail = getValues('email')
    if (!currentEmail) {
      return
    }

    setSuccessMessage(null)
    resendVerification({ email: currentEmail })
  }, [getValues, resendVerification, setSuccessMessage])
}

function resolveVerifyEmailStatusMessage(verifyError: unknown, resendError: unknown) {
  if (verifyError instanceof ApiError) {
    return verifyError.message
  }

  if (resendError instanceof ApiError) {
    return resendError.message
  }

  return 'Confirme o email para liberar o primeiro acesso ao portal.'
}
