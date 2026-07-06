export const ME = `
query Me {
  me {
    uniqueId
    email
    firstName
    lastName
    role { name }
    preferredLocale
    allPermissions { name }
     avatar {
      uniqueId
      size
      uri
    }
  }
}`

export const MY_SESSIONS = `
query MySessions {
  mySessions {
    uniqueId
    userAgent
    ipAddress
    createdAt
    expiresAt
  }
}`

export const MY_NEWSLETTER_SUBSCRIPTION = `
query MyNewsletterSubscription {
  myNewsletterSubscription {
    uniqueId
    isActive
    createdAt
    updatedAt
    userId
  }
}`

export const MY_PROFILE = `
query MyProfile {
  myNewsletterSubscription {
    uniqueId
    userId
  }
  me {
    uniqueId
    isActive
    createdAt
    updatedAt
    email
    firstName
    lastName
    tenantId
    preferredLocale
    role {
      uniqueId
      name
      description
    }
    permissions {
      uniqueId
      name
      description
    }
    allPermissions {
      uniqueId
      name
      description
    }
    avatar {
      uniqueId
      size
      uri
    }
  }
}`

export const MY_PROFILE_PARTIAL = `
query MyProfilePartial {
  myNewsletterSubscription {
    uniqueId
    userId
  }
  me {
    uniqueId
    isActive
    email
    firstName
    lastName
    preferredLocale
    role {
      uniqueId
      name
      description
    }
    avatar {
      uniqueId
      size
      uri
    }
  }
}`

export const VISITOR_STATS = `
query GetVisitorStats($pagination: PaginationInput, $filter: VisitorStatFilterInput) {
  getVisitorStats(pagination: $pagination, filter: $filter) {
    total
    page
    limit
    totalPages
    hasNextPage
    hasPrevPage
    data {
      date
      path
      viewCount
      uniqueVisitorCount
    }
  }
}`

export const GET_USERS = `
query GetUsers($pagination: PaginationInput, $filter: UserFilterInput, $orderBy: UserOrderInput) {
  getUsers(pagination: $pagination, filter: $filter, orderBy: $orderBy) {
    data {
      uniqueId
      isActive
      createdAt
      updatedAt
      email
      firstName
      lastName
      role {
        uniqueId
        name
        description
      }
      tenantId
      permissions {
        uniqueId
        name
        description
      }
      allPermissions {
        uniqueId
        name
        description
      }
      preferredLocale
      emailVerifiedAt
      avatar {
        uniqueId
        size
        uri
      }
    }
    total
    page
    limit
    totalPages
    hasNextPage
    hasPrevPage
  }
}`

export const GET_ROLES = `
query GetRoles($pagination: PaginationInput, $filter: RoleFilterInput, $orderBy: RoleOrderInput) {
  getRoles(pagination: $pagination, filter: $filter, orderBy: $orderBy) {
    data {
      uniqueId
      isActive
      createdAt
      updatedAt
      name
      description
      permissions {
        uniqueId
        name
        description
      }
    }
    total
    page
    limit
    totalPages
    hasNextPage
    hasPrevPage
  }
}`

export const GET_PAGE_VIEWS = `
query GetPageViews($pagination: PaginationInput, $filter: PageViewFilterInput) {
  getPageViews(pagination: $pagination, filter: $filter) {
    data {
      id
      path
      referrer
      userAgent
      country
      sessionId
      userId
      createdAt
    }
    total
    page
    limit
    totalPages
    hasNextPage
    hasPrevPage
  }
}`

export const GET_FILES = `
query GetFiles($pagination: PaginationInput, $filter: FileFilterInput, $orderBy: FileOrderInput) {
  getFiles(pagination: $pagination, filter: $filter, orderBy: $orderBy) {
    data {
      uniqueId
      size
      uri
    }
    total
    page
    limit
    totalPages
    hasNextPage
    hasPrevPage
  }
}`

export const GET_FILE = `
query GetFile($uniqueId: String!) {
  getFile(uniqueId: $uniqueId) {
    uniqueId
    mimeType
    size
    uri
  }
}`

export const GET_CAMPAIGNS = `
query GetCampaigns($pagination: PaginationInput, $filter: CampaignFilterInput, $orderBy: CampaignOrderInput) {
  getCampaigns(pagination: $pagination, filter: $filter, orderBy: $orderBy) {
    data {
      uniqueId
      isActive
      createdAt
      updatedAt
      subject
      bodyHtml
      bodyText
      status
      scheduledAt
      sentAt
      recipientCount
    }
    total
    page
    limit
    totalPages
    hasNextPage
    hasPrevPage
  }
}`

export const GET_CAMPAIGN = `
query GetCampaign($uniqueId: String!) {
  getCampaign(uniqueId: $uniqueId) {
    uniqueId
    isActive
    createdAt
    updatedAt
    subject
    bodyHtml
    bodyText
    status
    scheduledAt
    sentAt
    recipientCount
  }
}`

export const GET_CAMPAIGN_RECIPIENTS = `
query GetCampaignRecipients($campaignUniqueId: String!, $pagination: PaginationInput, $filter: CampaignRecipientFilterInput) {
  getCampaignRecipients(campaignUniqueId: $campaignUniqueId, pagination: $pagination, filter: $filter) {
    data {
      uniqueId
      status
      sentAt
      error
      subscriberEmail
      subscriberFirstName
      subscriberLastName
    }
    total
    page
    limit
    totalPages
    hasNextPage
    hasPrevPage
  }
}`

export const GET_NEWSLETTER_SUBSCRIBERS = `
query GetNewsletterSubscribers($pagination: PaginationInput, $filter: NewsletterSubscriberFilterInput) {
  getNewsletterSubscribers(pagination: $pagination, filter: $filter) {
    data {
      uniqueId
      isActive
      createdAt
      email
      firstName
      lastName
    }
    total
    page
    limit
    totalPages
    hasNextPage
    hasPrevPage
  }
}`

export const GET_ALL_PERMISSIONS = `
query GetAllPermissions {
  getAllPermissions {
    uniqueId
    isActive
    createdAt
    updatedAt
    name
    description
  }
}`
export const SUPPORTED_LOCALES = `
query Query {
  getSupportedLocales
}`

//  Notifications

export const GET_MY_NOTIFICATIONS = `
query GetMyNotifications($pagination: PaginationInput, $filter: NotificationFilterInput) {
  getMyNotifications(pagination: $pagination, filter: $filter) {
    data {
      uniqueId
      type
      titleKey
      messageKey
      params
      link
      readAt
      createdAt
    }
    total
    page
    limit
    totalPages
    hasNextPage
    hasPrevPage
    unreadCount
  }
}`
