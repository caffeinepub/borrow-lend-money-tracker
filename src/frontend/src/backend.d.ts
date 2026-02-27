import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export type Time = bigint;
export interface Contact {
    principal: Principal;
    addedAt: Time;
}
export interface Notification {
    id: string;
    userId: Principal;
    createdAt: Time;
    read: boolean;
    relatedRequestId?: string;
    message: string;
}
export interface BorrowLendRequest {
    id: string;
    status: RequestStatus;
    createdAt: Time;
    description: string;
    toPrincipal: Principal;
    updatedAt: Time;
    fromPrincipal: Principal;
    amount: number;
    requestType: RequestType;
}
export interface UserProfile {
    displayName: string;
    createdAt: Time;
    email: string;
    mobile: string;
}
export interface Transaction {
    id: string;
    completedAt: Time;
    requestId: string;
    toPrincipal: Principal;
    fromPrincipal: Principal;
    amount: number;
    requestType: RequestType;
}
export enum RequestStatus {
    pending = "pending",
    completed = "completed",
    rejected = "rejected",
    accepted = "accepted"
}
export enum RequestType {
    lend = "lend",
    borrow = "borrow"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addContact(contactPrincipal: Principal): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createRequest(toPrincipal: Principal, requestType: RequestType, amount: number, description: string): Promise<string>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getContacts(): Promise<Array<Contact>>;
    getDashboardSummary(): Promise<{
        pendingCount: bigint;
        totalOwe: number;
        totalOwedToMe: number;
    }>;
    getMyNotifications(): Promise<Array<Notification>>;
    getMyProfile(): Promise<UserProfile | null>;
    getMyRequests(): Promise<Array<BorrowLendRequest>>;
    getMyTransactions(): Promise<Array<Transaction>>;
    getRequestById(requestId: string): Promise<BorrowLendRequest | null>;
    getUnreadCount(): Promise<bigint>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    isContact(contactPrincipal: Principal): Promise<boolean>;
    isProfileComplete(): Promise<boolean>;
    markAllNotificationsRead(): Promise<void>;
    markCompleted(requestId: string): Promise<void>;
    markNotificationRead(notificationId: string): Promise<void>;
    registerProfile(mobile: string, displayName: string, email: string): Promise<void>;
    removeContact(contactPrincipal: Principal): Promise<void>;
    respondToRequest(requestId: string, accept: boolean): Promise<void>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
    searchContactByMobileOrEmail(searchTerm: string): Promise<Array<[Principal, UserProfile]>>;
    updateProfile(mobile: string, displayName: string): Promise<void>;
}
