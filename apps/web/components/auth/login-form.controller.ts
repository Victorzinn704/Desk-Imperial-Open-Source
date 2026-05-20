'use client'

import { useEffect, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query'
import { useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  ApiError,
  type AuthResponse,
  fetchCurrentUser,
  fetchFinanceSummary,
  fetchOrders,
  fetchProducts,
  login,
  loginDemo,
  type LoginPayload,
} from '@/lib/api'
import { resolveAuthenticatedRoute } from '@/lib/authenticated-route'
import { type LoginFormValues, loginSchema } from '@/lib/validation'

export type LoginMode = LoginFormValues['loginMode']

const LOGIN_PREFETCH_ROUTES = ['/design-lab/overview', '/design-lab/pdv', '/app', '/app/owner', '/app/staff']

function prewarmDashboardEntry(queryClient: QueryClient, role: AuthResponse['user']['role']) {
  const tasks = [
    queryClient.prefetchQuery({
      queryKey: ['auth', 'me'],
      queryFn: fetchCurrentUser,
      staleTime: 30_000,
    }),
  ]

  if (role === 'OWNER') {
    tasks.push(
      queryClient.prefetchQuery({
        queryKey: ['finance', 'summary'],
        queryFn: fetchFinanceSummary,
        staleTime: 60_000,
      }),
    )
    void Promise.allSettled(tasks)
    return
  }

  tasks.push(
    queryClient.prefetchQuery({
      queryKey: ['products'],
      queryFn: fetchProducts,
      staleTime: 5 * 60_000,
    }),
    queryClient.prefetchQuery({
      queryKey: ['orders', 'summary'],
      queryFn: () => fetchOrders({ includeCancelled: false, includeItems: false }),
      staleTime: 30_000,
    }),
  )

  void Promise.allSettled(tasks)
}

function prefetchLoginRoutes(router: ReturnType<typeof useRouter>) {
  for (const route of LOGIN_PREFETCH_ROUTES) {
    router.prefetch(route)
  }
}

function extractApiErrorMessage(error: unknown): string | null {
  return error instanceof ApiError ? error.message : null
}

function shouldRedirectOwnerToEmailVerification(error: unknown, variables: LoginPayload) {
  if (!(error instanceof ApiError)) {
    return false
  }

  if (error.status !== 403) {
    return false
  }

  if (variables.loginMode !== 'OWNER') {
    return false
  }

  return typeof variables.email === 'string'
}

function buildLoginPayload(values: LoginFormValues): LoginPayload {
  if (values.loginMode === 'STAFF') {
    return {
      loginMode: 'STAFF',
      companyEmail: values.companyEmail,
      employeeCode: values.employeeCode,
      password: values.password,
    }
  }

  return {
    loginMode: 'OWNER',
    email: values.email,
    password: values.password,
  }
}

function buildDemoLoginPayload(loginMode: LoginMode): Parameters<typeof loginDemo>[0] {
  const demoPayloads = {
    OWNER: { loginMode: 'OWNER' },
    STAFF: { loginMode: 'STAFF', employeeCode: 'VD-001' },
  } satisfies Record<LoginMode, Parameters<typeof loginDemo>[0]>

  return demoPayloads[loginMode]
}

function useLoginFormState() {
  const [showPassword, setShowPassword] = useState(false)

  const {
    register: registerField,
    handleSubmit,
    setValue,
    control,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      loginMode: 'OWNER',
      email: '',
      companyEmail: '',
      employeeCode: '',
      password: '',
    },
  })

  const watchedLoginMode = useWatch({
    control,
    name: 'loginMode',
  })
  const loginMode = watchedLoginMode ?? 'OWNER'

  const setLoginMode = (mode: LoginMode) => {
    setValue('loginMode', mode, { shouldDirty: true, shouldValidate: true })

    if (mode === 'OWNER') {
      setValue('companyEmail', '', { shouldDirty: false, shouldValidate: false })
      setValue('employeeCode', '', { shouldDirty: false, shouldValidate: false })
      return
    }

    setValue('email', '', { shouldDirty: false, shouldValidate: false })
  }

  return {
    errors,
    handleSubmit,
    isStaffMode: loginMode === 'STAFF',
    loginMode,
    registerField,
    setLoginMode,
    setShowPassword,
    showPassword,
  }
}

function useAuthenticatedLoginFlow() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [isRouting, startTransition] = useTransition()

  useEffect(() => {
    prefetchLoginRoutes(router)
  }, [router])

  const completeAuthenticatedLogin = (data: AuthResponse) => {
    queryClient.setQueryData(['auth', 'me'], { user: data.user })
    prewarmDashboardEntry(queryClient, data.user.role)
    startTransition(() => {
      router.replace(resolveAuthenticatedRoute(data.user.role, window.innerWidth))
    })
  }

  const redirectToEmailVerification = () => {
    startTransition(() => {
      router.push('/verificar-email')
    })
  }

  return {
    completeAuthenticatedLogin,
    isRouting,
    redirectToEmailVerification,
  }
}

function useLoginMutations(flow: ReturnType<typeof useAuthenticatedLoginFlow>) {
  const loginMutation = useMutation<AuthResponse, ApiError, LoginPayload>({
    mutationFn: (payload) => login(payload),
    onSuccess: flow.completeAuthenticatedLogin,
    onError: (error, variables) => {
      if (!shouldRedirectOwnerToEmailVerification(error, variables)) {
        return
      }

      flow.redirectToEmailVerification()
    },
  })

  const demoLoginMutation = useMutation({
    mutationFn: loginDemo,
    onSuccess: flow.completeAuthenticatedLogin,
  })

  return {
    demoLoginMutation,
    loginMutation,
  }
}

export function useLoginFormController() {
  const formState = useLoginFormState()
  const flow = useAuthenticatedLoginFlow()
  const { demoLoginMutation, loginMutation } = useLoginMutations(flow)

  const onSubmit = formState.handleSubmit((values) => {
    loginMutation.mutate(buildLoginPayload(values))
  })

  const onDemoLogin = () => {
    demoLoginMutation.mutate(buildDemoLoginPayload(formState.loginMode))
  }

  const isLoading = loginMutation.isPending || demoLoginMutation.isPending || flow.isRouting
  const errorMessage = extractApiErrorMessage(loginMutation.error) ?? extractApiErrorMessage(demoLoginMutation.error)

  return {
    ...formState,
    errorMessage,
    isLoading,
    onDemoLogin,
    onSubmit,
  }
}
