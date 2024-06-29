FSM = {}
FSM.__index = FSM

function FSM.new(initialState)
    local self = setmetatable({}, FSM)
    self.states = {}
    self.currentState = nil
    self:addState(initialState)
    self:changeState(initialState.name)
    return self
end

function FSM:addState(state)
    state.fsm = self
    self.states[state.name] = state
end

function FSM:removeState(name)
    self.states[name] = nil
end

function FSM:changeState(name)
    assert(self.states[name], "State does not exist: " .. name)
    if self.currentState and self.currentState.on_exit then
        self.currentState.on_exit(self.currentState)
    end
    self.currentState = self.states[name]
    if self.currentState.on_enter then
        self.currentState.on_enter(self.currentState)
    end
end

function FSM:update(time, delta)
    if self.currentState and self.currentState.update then
        self.currentState.update(self.currentState, time, delta)
    end
end
-- Example of usage

-- Defining states with self-transition logic
idleState = {
    name = "idle",
    time_idle = 0,
    on_enter = function(self)
        print("Entering Idle State")
    end,
    on_exit = function(self)
        print("Exiting Idle State")
    end,
    update = function(self, time, delta)
        -- Condition to transition to walking state
        self.time_idle = self.time_idle + delta
        if self.time_idle > 5 then
            print("Idle to Walking")
            self.time_idle = 0
            self.fsm:changeState("walking")
        end
    end
}

walkingState = {
    name = "walking",
    time_walking = 0,
    on_enter = function(self)
        print("Entering Walking State")
    end,
    on_exit = function(self)
        print("Exiting Walking State")
    end,
    update = function(self, time, delta)
        self.time_walking = self.time_walking + delta
        -- Condition to transition to idle state
        if self.time_walking > 10 then
            print("Walking to Idle")
            self.time_walking = 0
            self.fsm:changeState("idle")
        end
    end
}

fsm:addState(idleState)
fsm:addState(walkingState)
fsm:changeState("idle")

-- Create the FSM instance with the initial state
fsm = FSM.new(idleState)
