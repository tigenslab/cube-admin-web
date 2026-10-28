export interface VersionMetadata {
  version: number
  type: string
  created_at: string
  created_by: string
}

export interface CourseResourceItem {
  id: string
  type: string
  course_id?: string
  package_id?: string
  unit_id?: string
  code?: string
  title?: string
  versions?: VersionMetadata[]
  ancestry?: string
  position?: number
  component_ids?: string[]
  content?: Record<string, unknown>
  metadata?: Record<string, unknown>
  merged_content?: Record<string, unknown>
  permissions?: Record<string, boolean>
}

export interface UnitBlockComponent {
  id: string
  type: string
  component_class?: string
  unit_id: string
  block_id: string
  content: Record<string, unknown>
  permissions?: Record<string, boolean>
}

export type CourseResourceInput = Partial<Pick<CourseResourceItem,
  'type' | 'unit_id' | 'code' | 'title' | 'ancestry' | 'position' | 'content' | 'metadata'
>>
