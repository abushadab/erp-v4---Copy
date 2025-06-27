import { type User as UserType } from '@/lib/types'

export interface ValidationResult {
  isValid: boolean
  errors: string[]
}

export const validateEmail = (email: string): ValidationResult => {
  const errors: string[] = []
  
  if (!email) {
    errors.push('Email is required')
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.push('Please enter a valid email address')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export const validateName = (name: string): ValidationResult => {
  const errors: string[] = []
  
  if (!name) {
    errors.push('Name is required')
  } else if (name.length < 2) {
    errors.push('Name must be at least 2 characters long')
  } else if (name.length > 100) {
    errors.push('Name must be less than 100 characters')
  } else if (!/^[a-zA-Z\s'-]+$/.test(name)) {
    errors.push('Name can only contain letters, spaces, hyphens, and apostrophes')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export const validateRole = (role: string): ValidationResult => {
  const errors: string[] = []
  const validRoles = ['super_admin', 'admin', 'manager', 'sales', 'warehouse', 'accountant']
  
  if (!role) {
    errors.push('Role is required')
  } else if (!validRoles.includes(role)) {
    errors.push('Please select a valid role')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export const validateStatus = (status: string): ValidationResult => {
  const errors: string[] = []
  const validStatuses = ['active', 'inactive', 'pending', 'suspended']
  
  if (!status) {
    errors.push('Status is required')
  } else if (!validStatuses.includes(status)) {
    errors.push('Please select a valid status')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export const validateDepartment = (department: string): ValidationResult => {
  const errors: string[] = []
  
  if (!department) {
    errors.push('Department is required')
  } else if (department.length < 2) {
    errors.push('Department must be at least 2 characters long')
  } else if (department.length > 50) {
    errors.push('Department must be less than 50 characters')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export const validateAvatarUrl = (url: string): ValidationResult => {
  const errors: string[] = []
  
  if (url && url.length > 0) {
    try {
      new URL(url)
      // Only validate that it's a valid URL
      // Image validation should be done when loading the image
    } catch {
      errors.push('Please provide a valid URL')
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export const validateUserForm = (userData: {
  name: string
  email: string
  role: string
  department: string
  status: string
  avatar?: string
}): ValidationResult => {
  const allErrors: string[] = []
  
  const nameValidation = validateName(userData.name)
  const emailValidation = validateEmail(userData.email)
  const roleValidation = validateRole(userData.role)
  const statusValidation = validateStatus(userData.status)
  const departmentValidation = validateDepartment(userData.department)
  const avatarValidation = validateAvatarUrl(userData.avatar || '')
  
  allErrors.push(
    ...nameValidation.errors,
    ...emailValidation.errors,
    ...roleValidation.errors,
    ...statusValidation.errors,
    ...departmentValidation.errors,
    ...avatarValidation.errors
  )
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  }
}

export const checkEmailUniqueness = async (
  email: string, 
  existingUsers: UserType[], 
  currentUserId?: string
): Promise<ValidationResult> => {
  const errors: string[] = []
  
  const emailExists = existingUsers.some(user => 
    user.email.toLowerCase() === email.toLowerCase() && 
    user.id !== currentUserId
  )
  
  if (emailExists) {
    errors.push('This email address is already in use')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

export const validateBulkUserData = (users: UserType[]): ValidationResult => {
  const errors: string[] = []
  
  if (users.length === 0) {
    errors.push('No users provided')
    return { isValid: false, errors }
  }
  
  // Check for duplicate emails within the batch
  const emails = users.map(user => user.email.toLowerCase())
  const duplicateEmails = emails.filter((email, index) => emails.indexOf(email) !== index)
  
  if (duplicateEmails.length > 0) {
    errors.push(`Duplicate email addresses found: ${[...new Set(duplicateEmails)].join(', ')}`)
  }
  
  // Validate each user
  users.forEach((user, index) => {
    const userValidation = validateUserForm(user)
    if (!userValidation.isValid) {
      errors.push(`User ${index + 1} (${user.name}): ${userValidation.errors.join(', ')}`)
    }
  })
  
  return {
    isValid: errors.length === 0,
    errors
  }
} 