# Signals

```js
const signal = create_signal({
    name: "name",
    value: 5,
});

signal.share_with(other_side);
/*
        Here other_side is either just an address or an established connection to a "signal_reciever"
    */

// Signal can be any serializable, internally it has an additional ID used to match the data
signal.update({
    name: "name",
    value: 10,
});

signal.terminate();

// Any more fancy logic to handle the listeners
```

```js

    SignalListener.on_new_signal((s) => {
        this.signals.push(s)
        ...
    });

    s.on_update((new_value) => {})
    s.on_terminate(() => {})
    s.unsubscribe(() => {})
    s.global_unsubscribe(() => {})

    // With potential management of errors, have to figure that out

```

# Paywall

```js
// Weak version
if ((await user_tier()) == "free_tier") {
}

// Strong version - via verification server
data = await paywall_response({
    target: "",
    payload: "",
});

// Routes the request (probably over core) to our servers. These check if the user is authorized to have this request
// We forward it to the pluginDeveloper server which doesn't need to track individual user verification
```

# Stuff

```js
requested_communication_partner = await plugin_partner("my fancy plugin-uuid");
// => a thing we can directly send things to

requested_communication_partner.encrypt_messages = true;
// Is there is a reason to believe that someone inbetween may listens in.
// We a) encrypt all logging information
// and b) check if there is a trusted path from a) to b) to send encrypted messages along.
// Then we just use normal encryption protocolls
// Otherwise: Connect to a trusted 3rd party point (our servers) and connect that way securely
// i.e. we send back we want a trusted connection to there. bla.
// Assuming NO KERNEL IS COMPROMISED this can ensure that noone can fake being the other side - in the worst case it then fails
```
