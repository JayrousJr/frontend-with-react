//  Auth (GraphQL)

export const REGISTER_USER = `
mutation RegisterUser($registerUserInput: RegisterUserInput!) {
  registerUser(registerUserInput: $registerUserInput) {
    uniqueId
    email
    firstName
    lastName
  }
}`

export const VERIFY_EMAIL = `
mutation VerifyEmail($token: String!) {
  verifyEmail(token: $token) {
    uniqueId
    email
    firstName
    lastName
  }
}`

export const FORGOT_PASSWORD = `
mutation ForgotPassword($email: String!) {
  forgotPassword(email: $email)
}`

export const RESET_PASSWORD = `
mutation ResetPassword($token: String!, $password: String!) {
  resetPassword(token: $token, password: $password)
}`

export const CHANGE_PASSWORD = ` 
mutation ChangePassword($currentPassword: String!, $newPassword: String!) {
  changePassword(currentPassword: $currentPassword, newPassword: $newPassword) {
    message
  }
}

  `

export const RESEND_VERIFICATION = `
mutation ResendVerification($email: String!) {
  resendVerification(email: $email)
}`

export const REVOKE_SESSION = `
mutation RevokeSession($uniqueId: String!) {
  revokeSession(uniqueId: $uniqueId)
}`

//  Users

export const CREATE_USER = `
mutation CreateUser($createUserInput: CreateUserInput!) {
  createUser(createUserInput: $createUserInput) {
    message
    data {
      uniqueId
      email
      firstName
      lastName
      role {
        uniqueId
        name
      }
      allPermissions {
        uniqueId
        name
      }
    }
  }
}`

export const UPDATE_USER = `
mutation UpdateUser($updateUserInput: UpdateUserInput!) {
  updateUser(updateUserInput: $updateUserInput) {
    message
  }
}`

export const DELETE_USER = `
mutation DeleteUser($uniqueId: String!) {
  deleteUser(uniqueId: $uniqueId) {
    message
  }
}`

export const ASSIGN_USER_ROLE = `
mutation AssignUserRole($assignUserRoleInput: AssignUserRoleInput!) {
  assignUserRole(assignUserRoleInput: $assignUserRoleInput) {
    message
    data {
      uniqueId
      email
      firstName
      lastName
      role {
        uniqueId
        name
      }
    }
  }
}`

export const SET_USER_PERMISSIONS = `
mutation SetUserPermissions($setUserPermissionsInput: SetUserPermissionsInput!) {
  setUserPermissions(setUserPermissionsInput: $setUserPermissionsInput) {
    message
    data {
      uniqueId
      email
      allPermissions {
        uniqueId
        name
      }
    }
  }
}`

//  Roles

export const CREATE_ROLE = `
mutation CreateRole($createRoleInput: CreateRoleInput!) {
  createRole(createRoleInput: $createRoleInput) {
    message
    data {
      uniqueId
      name
      description
      permissions {
        uniqueId
        name
      }
    }
  }
}`

export const UPDATE_ROLE = `
mutation UpdateRole($updateRoleInput: UpdateRoleInput!) {
  updateRole(updateRoleInput: $updateRoleInput) {
    message
    data {
      uniqueId
      name
      description
      permissions {
        uniqueId
        name
      }
    }
  }
}`

export const DELETE_ROLE = `
mutation DeleteRole($uniqueId: String!) {
  deleteRole(uniqueId: $uniqueId) {
    message
  }
}`

//  Campaigns

export const CREATE_CAMPAIGN = `
mutation CreateCampaign($input: CreateCampaignInput!) {
  createCampaign(input: $input) {
    message
    data {
      uniqueId
      subject
      bodyHtml
      bodyText
      status
    }
  }
}`

export const UPDATE_CAMPAIGN = `
mutation UpdateCampaign($input: UpdateCampaignInput!) {
  updateCampaign(input: $input) {
    message
    data {
      uniqueId
      subject
      bodyHtml
      bodyText
      status
    }
  }
}`

export const DELETE_CAMPAIGN = `
mutation DeleteCampaign($uniqueId: String!) {
  deleteCampaign(uniqueId: $uniqueId) {
    message
  }
}`

export const SEND_CAMPAIGN = `
mutation SendCampaign($uniqueId: String!) {
  sendCampaign(uniqueId: $uniqueId) {
    message
    data {
      uniqueId
      status
      sentAt
      recipientCount
    }
  }
}`

export const SCHEDULE_CAMPAIGN = `
mutation ScheduleCampaign($input: ScheduleCampaignInput!) {
  scheduleCampaign(input: $input) {
    message
    data {
      uniqueId
      status
      scheduledAt
    }
  }
}`

//  Newsletter

export const SUBSCRIBE_TO_NEWSLETTER = `
mutation SubscribeToNewsletter {
  subscribeToNewsletter {
    message
  }
}`

export const UNSUBSCRIBE_FROM_NEWSLETTER = `
mutation UnsubscribeFromNewsletter {
  unsubscribeFromNewsletter {
    message
  }
}`

//  Files

export const DELETE_FILE = `
mutation DeleteFile($uniqueId: String!) {
  deleteFile(uniqueId: $uniqueId)
}`

//  Visitors

export const TRACK_PAGE_VIEW = `
mutation TrackPageView($input: TrackPageViewInput!) {
  trackPageView(input: $input) {
    id
    path
    referrer
    sessionId
    createdAt
  }
}`

//  Notifications

export const MARK_NOTIFICATION_READ = `
mutation MarkNotificationRead($uniqueId: String!) {
  markNotificationRead(uniqueId: $uniqueId) {
    data {
      uniqueId
      readAt
    }
    message
  }
}`

export const MARK_ALL_NOTIFICATIONS_READ = `
mutation MarkAllNotificationsRead {
  markAllNotificationsRead {
    message
  }
}`
