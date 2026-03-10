import { Role } from '@samachat/shared';

export interface RequestUser {
  id: string;
  email: string;
  role: Role;
  tenant_id?: string;
  name?: string;
}
