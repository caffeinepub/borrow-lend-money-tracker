import Map "mo:core/Map";
import Time "mo:core/Time";
import Float "mo:core/Float";
import Principal "mo:core/Principal";

module {
  // Old types from previous canister version
  type OldProfile = {
    username : Text;
    email : Text;
    mobile : Text;
    displayName : ?Text;
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

  type OldActor = {
    profiles : Map.Map<Principal, OldProfile>;
    usernameIndex : Map.Map<Text, Principal>;
    mobileIndex : Map.Map<Text, Principal>;
    emailIndex : Map.Map<Text, Principal>;
    contacts : Map.Map<Principal, Map.Map<Principal, Contact>>;
    requests : Map.Map<Text, BorrowLendRequest>;
    transactions : Map.Map<Text, Transaction>;
    notifications : Map.Map<Principal, Map.Map<Text, Notification>>;
  };

  // New types for current canister version
  type NewUserProfile = {
    displayName : Text;
    email : Text;
    mobile : Text;
    createdAt : Time.Time;
  };

  type NewActor = {
    profiles : Map.Map<Principal, NewUserProfile>;
    mobileIndex : Map.Map<Text, Principal>;
    contacts : Map.Map<Principal, Map.Map<Principal, Contact>>;
    requests : Map.Map<Text, BorrowLendRequest>;
    transactions : Map.Map<Text, Transaction>;
    notifications : Map.Map<Principal, Map.Map<Text, Notification>>;
  };

  // Helper function to convert optional display name
  func convertDisplayName(oldDisplayName : ?Text) : Text {
    switch (oldDisplayName) {
      case (?name) { name };
      case (null) { "Unnamed User" };
    };
  };

  // Migration function for upgrading actor state
  public func run(old : OldActor) : NewActor {
    let newProfiles = old.profiles.map<Principal, OldProfile, NewUserProfile>(
      func(_p, oldProfile) {
        {
          displayName = convertDisplayName(oldProfile.displayName);
          email = oldProfile.email;
          mobile = oldProfile.mobile;
          createdAt = oldProfile.createdAt;
        };
      }
    );

    // Explicitly omit usernameIndex and emailIndex from new state
    {
      old with
      profiles = newProfiles;
    };
  };
};
