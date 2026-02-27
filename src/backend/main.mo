import Map "mo:core/Map";
import Array "mo:core/Array";
import Time "mo:core/Time";
import Float "mo:core/Float";
import Text "mo:core/Text";
import Runtime "mo:core/Runtime";
import Iter "mo:core/Iter";
import Principal "mo:core/Principal";
import Migration "migration";
import MixinAuthorization "authorization/MixinAuthorization";
import AccessControl "authorization/access-control";

(with migration = Migration.run)
actor {
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  type UserProfile = {
    displayName : Text;
    email : Text;
    mobile : Text;
    createdAt : Time.Time;
  };

  type Contact = {
    principal : Principal;
    addedAt : Time.Time;
  };

  type RequestType = { #borrow; #lend };
  type RequestStatus = { #pending; #accepted; #rejected; #completed };

  type BorrowLendRequest = {
    id : Text;
    fromPrincipal : Principal;
    toPrincipal : Principal;
    requestType : RequestType;
    amount : Float;
    description : Text;
    status : RequestStatus;
    createdAt : Time.Time;
    updatedAt : Time.Time;
  };

  type Transaction = {
    id : Text;
    requestId : Text;
    fromPrincipal : Principal;
    toPrincipal : Principal;
    amount : Float;
    requestType : RequestType;
    completedAt : Time.Time;
  };

  type Notification = {
    id : Text;
    userId : Principal;
    message : Text;
    read : Bool;
    createdAt : Time.Time;
    relatedRequestId : ?Text;
  };

  // Persistent storage
  let profiles = Map.empty<Principal, UserProfile>();
  let mobileIndex = Map.empty<Text, Principal>();
  let contacts = Map.empty<Principal, Map.Map<Principal, Contact>>();
  let requests = Map.empty<Text, BorrowLendRequest>();
  let transactions = Map.empty<Text, Transaction>();
  let notifications = Map.empty<Principal, Map.Map<Text, Notification>>();

  // Helper functions
  func generateId(prefix : Text) : Text {
    prefix # "_" # Time.now().toText();
  };

  func getOrCreateContacts(caller : Principal) : Map.Map<Principal, Contact> {
    switch (contacts.get(caller)) {
      case (?existing) { existing };
      case (null) {
        let newContacts = Map.empty<Principal, Contact>();
        contacts.add(caller, newContacts);
        newContacts;
      };
    };
  };

  func getOrCreateNotifications(caller : Principal) : Map.Map<Text, Notification> {
    switch (notifications.get(caller)) {
      case (?existing) { existing };
      case (null) {
        let newNotifications = Map.empty<Text, Notification>();
        notifications.add(caller, newNotifications);
        newNotifications;
      };
    };
  };

  // Frontend-required profile functions
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    profiles.get(caller);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };

    // Validate non-empty fields
    if (profile.mobile.size() == 0 or profile.displayName.size() == 0 or profile.email.size() == 0) {
      Runtime.trap("Mobile, displayName, and email cannot be empty");
    };

    // Check if mobile is already taken by another user
    switch (mobileIndex.get(profile.mobile)) {
      case (?existing) {
        if (existing != caller) { 
          Runtime.trap("Mobile number already exists");
        };
      };
      case (null) {};
    };

    // Remove old mobile index if it exists and is different
    switch (profiles.get(caller)) {
      case (?oldProfile) {
        if (oldProfile.mobile != profile.mobile) {
          mobileIndex.remove(oldProfile.mobile);
        };
      };
      case (null) {};
    };

    profiles.add(caller, profile);
    mobileIndex.add(profile.mobile, caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    profiles.get(user);
  };

  // API Functions
  // User Profiles
  public shared ({ caller }) func registerProfile(mobile : Text, displayName : Text, email : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can register profiles");
    };

    // Validate non-empty fields
    if (mobile.size() == 0 or displayName.size() == 0 or email.size() == 0) {
      Runtime.trap("Mobile, displayName, and email cannot be empty");
    };

    // Check if profile or mobile already exists
    switch (profiles.get(caller)) {
      case (?_) { Runtime.trap("Profile already exists for this principal") };
      case (null) {};
    };
    switch (mobileIndex.get(mobile)) {
      case (?existing) {
        if (existing != caller) { Runtime.trap("Mobile number already exists") };
      };
      case (null) {};
    };

    let profile : UserProfile = {
      displayName;
      email;
      mobile;
      createdAt = Time.now();
    };

    profiles.add(caller, profile);
    mobileIndex.add(mobile, caller);
  };

  public shared ({ caller }) func updateProfile(mobile : Text, displayName : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update profiles");
    };

    // Validate non-empty fields
    if (mobile.size() == 0 or displayName.size() == 0) {
      Runtime.trap("Mobile and displayName cannot be empty");
    };

    let currentProfile = switch (profiles.get(caller)) {
      case (?p) { p };
      case (null) { Runtime.trap("Profile not found") };
    };

    // Check if mobile already exists
    switch (mobileIndex.get(mobile)) {
      case (?existing) {
        if (existing != caller) { Runtime.trap("Mobile number already exists") };
      };
      case (null) {};
    };

    // Remove old mobile index if different
    if (currentProfile.mobile != mobile) {
      mobileIndex.remove(currentProfile.mobile);
    };

    let updatedProfile : UserProfile = {
      displayName;
      email = currentProfile.email;
      mobile;
      createdAt = currentProfile.createdAt;
    };

    profiles.add(caller, updatedProfile);
    mobileIndex.add(mobile, caller);
  };

  public query ({ caller }) func getMyProfile() : async ?UserProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    profiles.get(caller);
  };

  public query ({ caller }) func isProfileComplete() : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check profile status");
    };
    profiles.containsKey(caller);
  };

  public query ({ caller }) func searchContactByMobileOrEmail(searchTerm : Text) : async [(Principal, UserProfile)] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can search for contacts");
    };

    switch (profiles.get(caller)) {
      case (null) { Runtime.trap("Complete your profile first") };
      case (?_) {};
    };

    profiles.entries().toArray().filter(
      func((p, profile)) {
        p != caller and (profile.mobile.contains(#text searchTerm) or profile.email.contains(#text searchTerm));
      }
    );
  };

  // Contacts
  public shared ({ caller }) func addContact(contactPrincipal : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can add contacts");
    };

    let contact : Contact = {
      principal = contactPrincipal;
      addedAt = Time.now();
    };

    let callerContacts = getOrCreateContacts(caller);
    callerContacts.add(contactPrincipal, contact);

    // In-app notification to added person
    createNotification(contactPrincipal, "You have been added as a contact", null);
  };

  public shared ({ caller }) func removeContact(contactPrincipal : Principal) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can remove contacts");
    };

    let callerContacts = getOrCreateContacts(caller);
    callerContacts.remove(contactPrincipal);
  };

  public query ({ caller }) func getContacts() : async [Contact] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view contacts");
    };

    switch (contacts.get(caller)) {
      case (?c) {
        c.values().toArray();
      };
      case (null) { [] };
    };
  };

  public query ({ caller }) func isContact(contactPrincipal : Principal) : async Bool {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can check contacts");
    };

    switch (contacts.get(caller)) {
      case (?c) {
        c.containsKey(contactPrincipal);
      };
      case (null) { false };
    };
  };

  // Borrow/Lend Requests
  public shared ({ caller }) func createRequest(toPrincipal : Principal, requestType : RequestType, amount : Float, description : Text) : async Text {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create requests");
    };

    let fromProfile = switch (profiles.get(caller)) {
      case (?p) { p };
      case (null) { Runtime.trap("Complete your profile first") };
    };
    switch (profiles.get(toPrincipal)) {
      case (null) { Runtime.trap("Recipient has no profile") };
      case (?_) {};
    };

    let id = generateId("req");
    let now = Time.now();
    let request : BorrowLendRequest = {
      id;
      fromPrincipal = caller;
      toPrincipal;
      requestType;
      amount;
      description;
      status = #pending;
      createdAt = now;
      updatedAt = now;
    };

    requests.add(id, request);
    createNotification(toPrincipal, "New request from " # fromProfile.displayName, ?id);
    id;
  };

  public shared ({ caller }) func respondToRequest(requestId : Text, accept : Bool) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can respond to requests");
    };

    let req = switch (requests.get(requestId)) {
      case (?r) { r };
      case (null) { Runtime.trap("Request not found") };
    };

    if (req.toPrincipal != caller) {
      Runtime.trap("Unauthorized: Only the recipient can respond to this request");
    };

    let newStatus = if (accept) { #accepted } else { #rejected };
    let updatedRequest : BorrowLendRequest = {
      id = req.id;
      fromPrincipal = req.fromPrincipal;
      toPrincipal = req.toPrincipal;
      requestType = req.requestType;
      amount = req.amount;
      description = req.description;
      status = newStatus;
      createdAt = req.createdAt;
      updatedAt = Time.now();
    };

    requests.add(requestId, updatedRequest);
    createNotification(req.fromPrincipal, (if (accept) { "Request accepted" } else { "Request rejected" }), ?requestId);

    if (accept) {
      let transactionId = generateId("txn");
      let txn : Transaction = {
        id = transactionId;
        requestId;
        fromPrincipal = req.fromPrincipal;
        toPrincipal = req.toPrincipal;
        amount = req.amount;
        requestType = req.requestType;
        completedAt = Time.now();
      };
      transactions.add(transactionId, txn);
    };
  };

  public shared ({ caller }) func markCompleted(requestId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark requests as completed");
    };

    let req = switch (requests.get(requestId)) {
      case (?r) { r };
      case (null) { Runtime.trap("Request not found") };
    };

    if (req.fromPrincipal != caller and req.toPrincipal != caller) {
      Runtime.trap("Unauthorized: Only parties involved can mark request as completed");
    };

    if (req.status != #accepted) {
      Runtime.trap("Only accepted requests can be marked as completed");
    };

    let updatedRequest : BorrowLendRequest = {
      id = req.id;
      fromPrincipal = req.fromPrincipal;
      toPrincipal = req.toPrincipal;
      requestType = req.requestType;
      amount = req.amount;
      description = req.description;
      status = #completed;
      createdAt = req.createdAt;
      updatedAt = Time.now();
    };

    requests.add(requestId, updatedRequest);

    // Notify both parties
    createNotification(req.fromPrincipal, "Request marked as completed", ?requestId);
    createNotification(req.toPrincipal, "Request marked as completed", ?requestId);
  };

  func createNotification(userId : Principal, message : Text, relatedRequestId : ?Text) {
    let notifId = generateId("notif");
    let notification : Notification = {
      id = notifId;
      userId;
      message;
      read = false;
      createdAt = Time.now();
      relatedRequestId;
    };

    let userNotifications = getOrCreateNotifications(userId);
    userNotifications.add(notifId, notification);
  };

  public query ({ caller }) func getMyRequests() : async [BorrowLendRequest] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view requests");
    };

    requests.values().toArray().filter(
      func(req) {
        req.fromPrincipal == caller or req.toPrincipal == caller;
      }
    );
  };

  public query ({ caller }) func getRequestById(requestId : Text) : async ?BorrowLendRequest {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view requests");
    };

    switch (requests.get(requestId)) {
      case (?req) {
        if (req.fromPrincipal == caller or req.toPrincipal == caller or AccessControl.isAdmin(accessControlState, caller)) {
          ?req;
        } else {
          Runtime.trap("Unauthorized: Can only view your own requests");
        };
      };
      case (null) { null };
    };
  };

  public query ({ caller }) func getMyTransactions() : async [Transaction] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view transactions");
    };

    transactions.values().toArray().filter(
      func(txn) {
        txn.fromPrincipal == caller or txn.toPrincipal == caller;
      }
    );
  };

  public query ({ caller }) func getMyNotifications() : async [Notification] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view notifications");
    };

    switch (notifications.get(caller)) {
      case (?userNotifs) { userNotifs.values().toArray() };
      case (null) { [] };
    };
  };

  public shared ({ caller }) func markNotificationRead(notificationId : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark notifications as read");
    };

    let userNotifs = getOrCreateNotifications(caller);
    switch (userNotifs.get(notificationId)) {
      case (?notif) {
        if (notif.userId != caller) {
          Runtime.trap("Unauthorized: Can only mark your own notifications as read");
        };
        let updatedNotif : Notification = {
          id = notif.id;
          userId = notif.userId;
          message = notif.message;
          read = true;
          createdAt = notif.createdAt;
          relatedRequestId = notif.relatedRequestId;
        };
        userNotifs.add(notificationId, updatedNotif);
      };
      case (null) { () };
    };
  };

  public shared ({ caller }) func markAllNotificationsRead() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can mark notifications as read");
    };

    let userNotifs = getOrCreateNotifications(caller);
    userNotifs.entries().forEach(
      func(id, notif) {
        let updatedNotif : Notification = {
          id = notif.id;
          userId = notif.userId;
          message = notif.message;
          read = true;
          createdAt = notif.createdAt;
          relatedRequestId = notif.relatedRequestId;
        };
        userNotifs.add(id, updatedNotif);
      }
    );
  };

  public query ({ caller }) func getUnreadCount() : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view notification count");
    };

    switch (notifications.get(caller)) {
      case (?userNotifs) {
        userNotifs.values().toArray().filter(
          func(n) { not n.read }
        ).size();
      };
      case (null) { 0 };
    };
  };

  public query ({ caller }) func getDashboardSummary() : async {
    totalOwe : Float;
    totalOwedToMe : Float;
    pendingCount : Nat;
  } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view dashboard");
    };

    let myRequests = requests.values().toArray().filter(
      func(req) {
        req.fromPrincipal == caller or req.toPrincipal == caller;
      }
    );

    let totalOwe = myRequests.filter(
      func(r) { r.fromPrincipal == caller and r.requestType == #borrow and r.status == #accepted }
    ).foldLeft(
      0.0,
      func(total, r) { total + r.amount },
    );

    let totalOwedToMe = myRequests.filter(
      func(r) { r.fromPrincipal == caller and r.requestType == #lend and r.status == #accepted }
    ).foldLeft(
      0.0,
      func(total, r) { total + r.amount },
    );

    let pendingCount = myRequests.filter(
      func(r) { r.status == #pending }
    ).size();

    {
      totalOwe;
      totalOwedToMe;
      pendingCount;
    };
  };
};
