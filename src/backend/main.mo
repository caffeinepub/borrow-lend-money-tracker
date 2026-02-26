import Map "mo:core/Map";
import Array "mo:core/Array";
import Int "mo:core/Int";
import Iter "mo:core/Iter";
import Order "mo:core/Order";
import Text "mo:core/Text";
import Float "mo:core/Float";
import Runtime "mo:core/Runtime";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  module User {
    public func compare(u1 : User, u2 : User) : Order.Order {
      Principal.compare(u1.principal, u2.principal);
    };
  };

  module Contact {
    public func compare(c1 : Contact, c2 : Contact) : Order.Order {
      Text.compare(c1.id, c2.id);
    };
  };

  module BorrowLendRequest {
    public func compare(r1 : BorrowLendRequest, r2 : BorrowLendRequest) : Order.Order {
      Text.compare(r1.id, r2.id);
    };
  };

  module Transaction {
    public func compare(t1 : Transaction, t2 : Transaction) : Order.Order {
      Text.compare(t1.id, t2.id);
    };
  };

  module Notification {
    public func compare(n1 : Notification, n2 : Notification) : Order.Order {
      Text.compare(n1.id, n2.id);
    };
  };

  // Types
  type User = {
    principal : Principal;
    displayName : Text;
    createdAt : Time.Time;
    isActive : Bool;
  };

  type Contact = {
    id : Text;
    ownerPrincipal : Principal;
    contactPrincipal : Principal;
    nickName : Text;
    createdAt : Time.Time;
  };

  type BorrowLendRequest = {
    id : Text;
    fromPrincipal : Principal;
    toPrincipal : Principal;
    amount : Float;
    requestType : Text;
    status : Text;
    notes : Text;
    createdAt : Time.Time;
    respondedAt : ?Time.Time;
  };

  type Transaction = {
    id : Text;
    requestId : Text;
    fromPrincipal : Principal;
    toPrincipal : Principal;
    amount : Float;
    transactionType : Text;
    createdAt : Time.Time;
  };

  type Notification = {
    id : Text;
    userPrincipal : Principal;
    message : Text;
    isRead : Bool;
    createdAt : Time.Time;
  };

  public type UserProfile = {
    name : Text;
    displayName : Text;
    createdAt : Time.Time;
    isActive : Bool;
  };

  // Persistent storage using core library
  let users = Map.empty<Principal, User>();
  let contacts = Map.empty<Text, Contact>();
  let requests = Map.empty<Text, BorrowLendRequest>();
  let transactions = Map.empty<Text, Transaction>();
  let notifications = Map.empty<Text, Notification>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  // Utility functions
  func generateId(prefix : Text, timestamp : Time.Time) : Text {
    prefix # "_" # timestamp.toText();
  };

  func getCurrentTime() : Time.Time {
    Time.now();
  };

  // UserProfile API Functions (required by frontend)
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // API Functions
  public shared ({ caller }) func registerOrUpdateProfile(displayName : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can register profiles");
    };

    if (displayName.isEmpty()) {
      Runtime.trap("Display name cannot be empty");
    };

    let now = getCurrentTime();
    let user : User = {
      principal = caller;
      displayName;
      createdAt = now;
      isActive = true;
    };

    users.add(caller, user);

    // Also update UserProfile for frontend compatibility
    let profile : UserProfile = {
      name = displayName;
      displayName;
      createdAt = now;
      isActive = true;
    };
    userProfiles.add(caller, profile);

    "Profile registered/updated successfully";
  };

  public query ({ caller }) func getMyProfile() : async User {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view their profile");
    };

    switch (users.get(caller)) {
      case (null) { Runtime.trap("User not found") };
      case (?user) { user };
    };
  };

  public shared ({ caller }) func addContact(contactPrincipal : Principal, nickName : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add contacts");
    };

    if (nickName.isEmpty()) {
      Runtime.trap("Nick name cannot be empty");
    };

    if (caller == contactPrincipal) {
      Runtime.trap("Cannot add yourself as a contact");
    };

    let contactId = generateId("contact", getCurrentTime());
    let contact : Contact = {
      id = contactId;
      ownerPrincipal = caller;
      contactPrincipal;
      nickName;
      createdAt = getCurrentTime();
    };

    contacts.add(contactId, contact);
    "Contact added successfully";
  };

  public query ({ caller }) func getMyContacts() : async [Contact] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view contacts");
    };

    contacts.values().toArray().filter(
      func(contact) {
        contact.ownerPrincipal == caller;
      }
    );
  };

  public shared ({ caller }) func createRequest(toPrincipal : Principal, amount : Float, requestType : Text, notes : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create requests");
    };

    if (amount <= 0) {
      Runtime.trap("Amount must be greater than 0");
    };

    if (caller == toPrincipal) {
      Runtime.trap("Cannot create a request to yourself");
    };

    // Check for duplicate pending request
    let duplicate = requests.values().toArray().any(
      func(request) {
        request.fromPrincipal == caller and request.toPrincipal == toPrincipal and request.status == "pending";
      }
    );

    if (duplicate) {
      Runtime.trap("Duplicate pending request exists");
    };

    let requestId = generateId("request", getCurrentTime());
    let request : BorrowLendRequest = {
      id = requestId;
      fromPrincipal = caller;
      toPrincipal;
      amount;
      requestType;
      status = "pending";
      notes;
      createdAt = getCurrentTime();
      respondedAt = null;
    };

    requests.add(requestId, request);

    // Create notification for recipient
    let notificationId = generateId("notification", getCurrentTime());
    let notification : Notification = {
      id = notificationId;
      userPrincipal = toPrincipal;
      message = "You have a new " # requestType # " request from " # caller.toText();
      isRead = false;
      createdAt = getCurrentTime();
    };

    notifications.add(notificationId, notification);
    "Request created successfully";
  };

  public query ({ caller }) func getMyRequests() : async {
    sent : [BorrowLendRequest];
    received : [BorrowLendRequest];
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view requests");
    };

    let sentRequests = requests.values().toArray().filter(
      func(request) {
        request.fromPrincipal == caller;
      }
    );

    let receivedRequests = requests.values().toArray().filter(
      func(request) {
        request.toPrincipal == caller;
      }
    );

    {
      sent = sentRequests;
      received = receivedRequests;
    };
  };

  public shared ({ caller }) func respondToRequest(requestId : Text, accept : Bool) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can respond to requests");
    };

    let request = switch (requests.get(requestId)) {
      case (null) { Runtime.trap("Request not found") };
      case (?req) { req };
    };

    if (request.toPrincipal != caller) {
      Runtime.trap("Unauthorized to respond to this request");
    };

    if (request.status != "pending") {
      Runtime.trap("Request is no longer pending");
    };

    let updatedRequest : BorrowLendRequest = {
      id = request.id;
      fromPrincipal = request.fromPrincipal;
      toPrincipal = request.toPrincipal;
      amount = request.amount;
      requestType = request.requestType;
      status = if (accept) { "accepted" } else { "declined" };
      notes = request.notes;
      createdAt = request.createdAt;
      respondedAt = ?getCurrentTime();
    };

    requests.add(requestId, updatedRequest);

    // Create notification for sender
    let notificationId = generateId("notification", getCurrentTime());
    let notification : Notification = {
      id = notificationId;
      userPrincipal = request.fromPrincipal;
      message = "Your request was " # (if (accept) { "accepted" } else { "declined" });
      isRead = false;
      createdAt = getCurrentTime();
    };

    notifications.add(notificationId, notification);

    if (accept) {
      // Create transaction record
      let transactionId = generateId("transaction", getCurrentTime());
      let transaction : Transaction = {
        id = transactionId;
        requestId;
        fromPrincipal = request.fromPrincipal;
        toPrincipal = request.toPrincipal;
        amount = request.amount;
        transactionType = request.requestType;
        createdAt = getCurrentTime();
      };

      transactions.add(transactionId, transaction);
    };

    "Request responded successfully";
  };

  public query ({ caller }) func getMyTransactions() : async [Transaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view transactions");
    };

    transactions.values().toArray().filter(
      func(transaction) {
        transaction.fromPrincipal == caller or transaction.toPrincipal == caller;
      }
    );
  };

  public query ({ caller }) func getMyNotifications() : async [Notification] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view notifications");
    };

    notifications.values().toArray().filter(
      func(notification) {
        notification.userPrincipal == caller;
      }
    );
  };

  public shared ({ caller }) func markNotificationRead(notificationId : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark notifications");
    };

    let notification = switch (notifications.get(notificationId)) {
      case (null) { Runtime.trap("Notification not found") };
      case (?notif) { notif };
    };

    if (notification.userPrincipal != caller) {
      Runtime.trap("Unauthorized to mark this notification");
    };

    let updatedNotification : Notification = {
      id = notification.id;
      userPrincipal = notification.userPrincipal;
      message = notification.message;
      isRead = true;
      createdAt = notification.createdAt;
    };

    notifications.add(notificationId, updatedNotification);
    "Notification marked as read";
  };

  public shared ({ caller }) func markAllNotificationsRead() : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark notifications");
    };

    let userNotifications = notifications.values().toArray().filter(
      func(notification) {
        notification.userPrincipal == caller and not notification.isRead;
      }
    );

    userNotifications.forEach(
      func(notification) {
        let updatedNotification : Notification = {
          id = notification.id;
          userPrincipal = notification.userPrincipal;
          message = notification.message;
          isRead = true;
          createdAt = notification.createdAt;
        };
        notifications.add(notification.id, updatedNotification);
      }
    );
    "All notifications marked as read";
  };

  public query ({ caller }) func getDashboardSummary() : async {
    totalBorrowed : Float;
    totalLent : Float;
    pendingRequests : Nat;
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view dashboard");
    };

    let userTransactions = transactions.values().toArray().filter(
      func(transaction) {
        transaction.fromPrincipal == caller or transaction.toPrincipal == caller;
      }
    );

    var totalBorrowed : Float = 0;
    var totalLent : Float = 0;

    userTransactions.forEach(
      func(transaction) {
        if (transaction.fromPrincipal == caller) {
          totalLent := totalLent + transaction.amount;
        } else if (transaction.toPrincipal == caller) {
          totalBorrowed := totalBorrowed + transaction.amount;
        };
      }
    );

    let pendingCount = requests.values().toArray().filter(
      func(request) {
        request.toPrincipal == caller and request.status == "pending";
      }
    ).size();

    {
      totalBorrowed;
      totalLent;
      pendingRequests = pendingCount;
    };
  };
};
