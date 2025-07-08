import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Function to get the resume download URL
export const getResumeDownloadUrl = async () => {
  try {
    const { data } = supabase.storage
      .from('resumes')
      .getPublicUrl('Jonathan_Christensen_Resume_2025.pdf')
    
    return data.publicUrl
  } catch (error) {
    console.error('Error getting resume URL:', error)
    return null
  }
}

// Function to download the resume
export const downloadResume = async () => {
  try {
    const { data, error } = await supabase.storage
      .from('resumes')
      .download('Jonathan_Christensen_Resume_2025.pdf')
    
    if (error) {
      console.error('Error downloading resume:', error)
      return false
    }
    
    // Create a blob URL and trigger download
    const url = URL.createObjectURL(data)
    const a = document.createElement('a')
    a.href = url
    a.download = 'Jonathan_Christensen_Resume_2025.pdf'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    
    return true
  } catch (error) {
    console.error('Error downloading resume:', error)
    return false
  }
}