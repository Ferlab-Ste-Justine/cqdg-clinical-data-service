export enum Status {
    IN_PROGRESS = 'IN_PROGRESS',
    COMPLETED = 'COMPLETED',
}

export interface IKeycloakUser {
    sub: string;
    preferred_username: string;
    email_verified: string;
    resource_access: string;
    realm_access: string;
    email: string;
    name: string;
    given_name: string;
    family_name: string;
}

export type KeycloakUser = IKeycloakUser;

export class User {
    public id: string;
    public userName: string;
    public emailVerified: string;
    public resourceAccess: string;
    public realmAccess: string;
    public email: string;
    public name: string;
    public firstName: string;
    public lastName: string;

    constructor(json: KeycloakUser) {
        this.id = json.sub || undefined;
        this.userName = json.preferred_username || undefined;
        this.emailVerified = json.email_verified || undefined;
        this.resourceAccess = json.resource_access || undefined;
        this.realmAccess = json.realm_access || undefined;
        this.email = json.email || undefined;
        this.name = json.name || undefined;
        this.firstName = json.given_name || undefined;
        this.lastName = json.family_name || undefined;
    }
}
