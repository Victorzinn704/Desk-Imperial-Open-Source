'use client'

import {
  LoginFooter,
  LoginHeader,
  LoginModeSwitcher,
  LoginSubmitActions,
  OwnerIdentityField,
  PasswordField,
  StaffIdentityFields,
} from './login-form.sections'
import { useLoginFormController } from './login-form.controller'

export function LoginForm() {
  const {
    errorMessage,
    errors,
    isLoading,
    isStaffMode,
    loginMode,
    onDemoLogin,
    onSubmit,
    registerField,
    setLoginMode,
    setShowPassword,
    showPassword,
  } = useLoginFormController()

  return (
    <div className="w-full space-y-8">
      <LoginHeader loginMode={loginMode} />

      <form className="space-y-5" onSubmit={onSubmit}>
        <LoginModeSwitcher loginMode={loginMode} setLoginMode={setLoginMode} />
        <input type="hidden" {...registerField('loginMode')} />

        {isStaffMode ? (
          <StaffIdentityFields errors={errors} registerField={registerField} />
        ) : (
          <OwnerIdentityField errors={errors} registerField={registerField} />
        )}

        <PasswordField
          errors={errors}
          isStaffMode={isStaffMode}
          registerField={registerField}
          setShowPassword={setShowPassword}
          showPassword={showPassword}
        />

        {errorMessage && <p className="text-xs text-red-400">{errorMessage}</p>}

        <LoginSubmitActions isLoading={isLoading} isStaffMode={isStaffMode} onDemoLogin={onDemoLogin} />
      </form>

      <LoginFooter />
    </div>
  )
}
