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
    id: string;
    nickName: string;
    ownerPrincipal: Principal;
    createdAt: Time;
    contactPrincipal: Principal;
}
export interface Notification {
    id: string;
    createdAt: Time;
    isRead: boolean;
    userPrincipal: Principal;
    message: string;
}
export interface User {
    principal: Principal;
    displayName: string;
    createdAt: Time;
    isActive: boolean;
}
export interface BorrowLendRequest {
    id: string;
    status: string;
    createdAt: Time;
    toPrincipal: Principal;
    fromPrincipal: Principal;
    notes: string;
    amount: number;
    respondedAt?: Time;
    requestType: string;
}
export interface UserProfile {
    displayName: string;
    name: string;
    createdAt: Time;
    isActive: boolean;
}
export interface Transaction {
    id: string;
    requestId: string;
    transactionType: string;
    createdAt: Time;
    toPrincipal: Principal;
    fromPrincipal: Principal;
    amount: number;
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export interface backendInterface {
    addContact(contactPrincipal: Principal, nickName: string): Promise<string>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    createRequest(toPrincipal: Principal, amount: number, requestType: string, notes: string): Promise<string>;
    getCallerUserProfile(): Promise<UserProfile | null>;
    getCallerUserRole(): Promise<UserRole>;
    getDashboardSummary(): Promise<{
        totalLent: number;
        pendingRequests: bigint;
        totalBorrowed: number;
    }>;
    getMyContacts(): Promise<Array<Contact>>;
    getMyNotifications(): Promise<Array<Notification>>;
    getMyProfile(): Promise<User>;
    getMyRequests(): Promise<{
        sent: Array<BorrowLendRequest>;
        received: Array<BorrowLendRequest>;
    }>;
    getMyTransactions(): Promise<Array<Transaction>>;
    getUserProfile(user: Principal): Promise<UserProfile | null>;
    isCallerAdmin(): Promise<boolean>;
    markAllNotificationsRead(): Promise<string>;
    markNotificationRead(notificationId: string): Promise<string>;
    registerOrUpdateProfile(displayName: string): Promise<string>;
    respondToRequest(requestId: string, accept: boolean): Promise<string>;
    saveCallerUserProfile(profile: UserProfile): Promise<void>;
}
