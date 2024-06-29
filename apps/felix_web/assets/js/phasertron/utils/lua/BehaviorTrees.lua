-- STATUSES
BehaviorStatus = {
    PENDING = "PENDING",
    RUNNING = "RUNNING",
    SUCCESS = "SUCCESS",
    FAILURE = "FAILURE",
    ERROR = "ERROR",
    TERMINATED = "TERMINATED"
}

-- BEHAVIOR TREE --------------------------------------------------------------------------------
BehaviorTree = {}
BehaviorTree.__index = BehaviorTree

function BehaviorTree:new(rootNode)
    local instance = setmetatable({}, self)
    instance.enabled = true
    instance.rootNode = rootNode
    return instance
end

function BehaviorTree:tick()
    if not self.enabled then
        return BehaviorStatus.FAILURE
    end
    return self.rootNode:tick()
end

function BehaviorTree:abort()
    return self.rootNode:abort()
end

function BehaviorTree:reset()
    self.rootNode:abort()
    self.rootNode.status = BehaviorStatus.PENDING
end

function BehaviorTree:setRootNode(node)
    self.rootNode:abort()
    self.rootNode = node
end

-- BEHAVIOR --------------------------------------------------------------------------------
Behavior = setmetatable({}, {
    __index = Behavior
})
Behavior.__index = Behavior

function Behavior:new()
    local instance = setmetatable({}, self)
    instance.status = BehaviorStatus.PENDING
    instance._isTerminated = false
    instance.shouldAbort = false
    return instance
end

function Behavior:onInitialize()
    self._isTerminated = false
    self.shouldAbort = false
    self.status = BehaviorStatus.RUNNING
end

function Behavior:update()
    if self.shouldAbort then
        if self.status == BehaviorStatus.RUNNING then
            self:onTerminate()
        end
        return BehaviorStatus.FAILURE
    end
    return self.status
end

function Behavior:abort()
    self.shouldAbort = true
    self:onTerminate()
end

function Behavior:onTerminate()
    self._isTerminated = true
    self.shouldAbort = false
end

function Behavior:tick()
    if self.shouldAbort then
        if self.status == BehaviorStatus.RUNNING then
            self:onTerminate()
        end
        self.status = BehaviorStatus.FAILURE
        return self.status
    end

    if self.status ~= BehaviorStatus.RUNNING then
        self:onInitialize()
    end

    self.status = self:update()

    if self.status ~= BehaviorStatus.RUNNING then
        self:onTerminate()
    end
    return self.status
end

-- Action -------------------------------------------------------------------

Action = setmetatable({}, {
    __index = Behavior
})
Action.__index = Action

function Action:new()
    local instance = setmetatable(Behavior:new(), self)
    return instance
end

-- Composite --------------------------------------------------------------------------------------------

Composite = setmetatable({}, {
    __index = Behavior
})
Composite.__index = Composite

function Composite:new(...)
    local instance = setmetatable(Behavior:new(), self)
    instance.children = {...}
    return instance
end

function Composite:addChild(behavior)
    table.insert(self.children, behavior)
end

function Composite:removeChild(behavior)
    local indexToRemove = nil
    for index, child in ipairs(self.children) do
        if child == behavior then
            indexToRemove = index
            break
        end
    end
    if indexToRemove then
        table.remove(self.children, indexToRemove)
    end
end

function Composite:clearChildren()
    self.children = {}
end

function Composite:getChildren()
    return self.children
end

-- Condition --------------------------------------------------------------------------------------------

Condition = setmetatable({}, {
    __index = Behavior
})
Condition.__index = Condition

function Condition:new()
    local instance = setmetatable(Behavior:new(), self)
    return instance
end

-- Decorator --------------------------------------------------------------------------------------------

Decorator = setmetatable({}, {
    __index = Behavior
})
Decorator.__index = Decorator

function Decorator:new(child)
    local instance = setmetatable(Behavior:new(), self)
    instance.child = child
    return instance
end

-- Sequence --------------------------------------------------------------------------------------------

Sequence = setmetatable({}, {
    __index = Composite
})
Sequence.__index = Sequence

function Sequence:new(...)
    local instance = setmetatable(Composite:new(...), self)
    instance.currentChildIndex = 1
    return instance
end

function Sequence:update()
    Composite.update(self)

    for i = self.currentChildIndex, #self.children do
        local status = self.children[i]:tick()
        if status == BehaviorStatus.RUNNING then
            self.currentChildIndex = i
            return status
        elseif status ~= BehaviorStatus.SUCCESS then
            self.currentChildIndex = 1
            return status
        end
    end

    self.currentChildIndex = 1
    return BehaviorStatus.SUCCESS
end

function Sequence:abort()
    self.shouldAbort = true
    for i = 1, #self.children do
        if self.children[i].status == BehaviorStatus.RUNNING then
            self.children[i]:abort()
            self.children[i]:onTerminate()
        end
    end
    -- self.currentChildIndex = 1
    self:onTerminate()
end

FreshSequence = setmetatable({}, {
    __index = Sequence
})
FreshSequence.__index = FreshSequence

function FreshSequence:new()
    local instance = setmetatable(Sequence:new(), self)
    return instance
end

function FreshSequence:abort()
    Sequence.abort(self)
    self.currentChildIndex = 1
end

-- Selector --------------------------------------------------------------------------------------------

Selector = setmetatable({}, {
    __index = Composite
})
Selector.__index = Selector

function Selector:new(...)
    local instance = setmetatable(Composite:new(...), self)
    instance.currentChildIndex = 1
    return instance
end

function Selector:update()
    Composite.update(self)
    for i = self.currentChildIndex, #self.children do
        if (self.shouldAbort) then
            return BehaviorStatus.FAILURE
        end

        local status = self.children[i]:tick()
        self.currentChildIndex = i
        if status ~= BehaviorStatus.FAILURE then
            self.currentChildIndex = (status == BehaviorStatus.RUNNING) and i or 1
        end
    end
    self.currentChildIndex = 1
    return BehaviorStatus.FAILURE
end

function Selector:abort()
    Composite.abort(self)
    if self.children[self.currentChildIndex] and
        (self.children[self.currentChildIndex].status == BehaviorStatus.RUNNING) then
        self.children[self.currentChildIndex]:abort()
    end
    self:onTerminate()
end

-- ActiveSelector --------------------------------------------------------------------------------------------

ActiveSelector = setmetatable({}, {
    __index = Selector
})
ActiveSelector.__index = ActiveSelector

function ActiveSelector:new()
    local instance = setmetatable(Selector:new(), self)
    return instance
end

function ActiveSelector:update()
    local prevIndex = self.currentChildIndex
    local previous = self.children[prevIndex]

    self.currentChildIndex = 1
    self:onInitialize()

    local result = Selector.update(self)

    if prevIndex ~= self.currentChildIndex and previous then
        if previous.status == BehaviorStatus.RUNNING then
            previous:abort()
        end
    end

    return result
end

-- ActiveSelector --------------------------------------------------------------------------------------------

ParallelPolicy = {
    RequireOne = "RequireOne",
    RequireAll = "RequireAll"
}

Parallel = setmetatable({}, {
    __index = Composite
})
Parallel.__index = Parallel

function Parallel:new(successPolicy, failurePolicy, children)
    local instance = setmetatable(Composite:new(children), self)
    instance.successPolicy = successPolicy
    instance.failurePolicy = failurePolicy
    return instance
end

function Parallel:update()
    local totalCount = #self.children
    local successCount = 0
    local failureCount = 0
    for i = 1, totalCount do
        local b = self.children[i]
        if not b._isTerminated then
            local status = b:tick()
            if status == BehaviorStatus.SUCCESS then
                successCount = successCount + 1
                if self.successPolicy == ParallelPolicy.RequireOne then
                    return BehaviorStatus.SUCCESS
                end
            elseif status == BehaviorStatus.FAILURE then
                failureCount = failureCount + 1
                if self.failurePolicy == ParallelPolicy.RequireOne then
                    return BehaviorStatus.FAILURE
                end
            end
        end
    end

    if self.failurePolicy == ParallelPolicy.RequireAll and failureCount == totalCount then
        return BehaviorStatus.FAILURE
    elseif self.successPolicy == ParallelPolicy.RequireAll and successCount == totalCount then
        return BehaviorStatus.SUCCESS
    end
    return BehaviorStatus.RUNNING
end

function Parallel:onTerminate()
    Composite.onTerminate(self)
    for i = 1, #self.children do
        local b = self.children[i]
        if b.status == BehaviorStatus.RUNNING then
            b:abort()
        end
    end
end

-- Inverter --------------------------------------------------------------------------------------------

Inverter = setmetatable({}, {
    __index = Decorator
})
Inverter.__index = Inverter

function Inverter:new(child)
    local instance = setmetatable(Decorator:new(child), self)
    return instance
end

function Inverter:tick()
    local childStatus = self.child:tick()
    if childStatus == BehaviorStatus.RUNNING then
        return BehaviorStatus.RUNNING
    end
    return (childStatus == BehaviorStatus.SUCCESS) and BehaviorStatus.FAILURE or BehaviorStatus.SUCCESS
end

-- Repeater --------------------------------------------------------------------------------------------

Repeater = setmetatable({}, {
    __index = Decorator
})
Repeater.__index = Repeater

function Repeater:new(repeatLimit, child)
    local instance = setmetatable(Decorator:new(child), self)
    instance.repeatLimit = repeatLimit
    instance.repeatCount = 0
    return instance
end

function Repeater:onTerminate()
    Decorator.onTerminate(self)
    self.repeatCount = 0
    self.status = BehaviorStatus.TERMINATED
    if self.child.status == BehaviorStatus.RUNNING then
        self.child:abort()
        self.child:onTerminate()
    end
end

function Repeater:update()
    local status = self.child:tick()
    if status == BehaviorStatus.FAILURE then
        return BehaviorStatus.FAILURE
    end
    self.repeatCount = self.repeatCount + 1
    return self.repeatCount >= self.repeatLimit and BehaviorStatus.SUCCESS or BehaviorStatus.RUNNING
end

-- Throttle --------------------------------------------------------------------------------------------

Throttle = setmetatable({}, {
    __index = Decorator
})
Throttle.__index = Throttle

function Throttle:new(throttleMs, child, throttledStatus)
    local instance = setmetatable(Decorator:new(child), self)
    instance.throttleMs = throttleMs
    instance.throttledStatus = throttledStatus or BehaviorStatus.RUNNING
    instance.lastTime = unixTime()
    return instance
end

function Throttle:onInitialize()
    Decorator.onInitialize(self)
    self.lastTime = unixTime()
end

function Throttle:update()
    Decorator.update(self)
    local now = unixTime()
    if (now - self.lastTime < self.throttleMs) then
        return self.throttledStatus
    else
        return self.child:tick()
    end
end

-- AlwaysFail --------------------------------------------------------------------------------------------

AlwaysFail = setmetatable({}, {
    __index = Decorator
})
AlwaysFail.__index = AlwaysFail

function AlwaysFail:new(child)
    local instance = setmetatable(Decorator:new(child), self)
    return instance
end

function AlwaysFail:update()
    self.child:update()
    return BehaviorStatus.FAILURE
end

function AlwaysFail:tick()
    self.child:tick()
    return BehaviorStatus.FAILURE
end

-- AlwaysSucceed --------------------------------------------------------------------------------------------

AlwaysSucceed = setmetatable({}, {
    __index = Decorator
})
AlwaysSucceed.__index = AlwaysSucceed

function AlwaysSucceed:new(child)
    local instance = setmetatable(Decorator:new(child), self)
    return instance
end

function AlwaysSucceed:update()
    self.child:update()
    return BehaviorStatus.SUCCESS
end

function AlwaysSucceed:tick()
    self.child:tick()
    return BehaviorStatus.SUCCESS
end

-- Randomize --------------------------------------------------------------------------------------------

Randomize = setmetatable({}, {
    __index = Behavior
})
Randomize.__index = Randomize
function Randomize:new(...)
    local instance = setmetatable(Behavior:new(), self)
    instance.children = {...}

    return instance
end

function Randomize:onInitialize()
    Behavior.onInitialize(self)
    local n = #self.children

    -- Fisher-Yates shuffle
    while n > 1 do
        local k = math.random(n)
        self.children[n], self.children[k] = self.children[k], self.children[n]
        n = n - 1
    end
end

function Randomize:tick()
    if (#self.children == 0) then
        throw("No children for Randomize BT node!")
    end

    Behavior.tick(self)
    return self.children[1]:tick()
end

function Randomize:update()
    return self.children[1].status
end

-- LoggingAction --------------------------------------------------------------------------------------------

LoggingAction = setmetatable({}, {
    __index = Action
})
LoggingAction.__index = LoggingAction

function LoggingAction:new(message, returnStatus)
    local instance = setmetatable(Action:new(), self)
    instance.message = message
    instance.returnStatus = returnStatus or BehaviorStatus.SUCCESS
    return instance
end

function LoggingAction:update()
    print('\t' .. (type(self.message) == 'function' and self.message() or self.message))
    return self.returnStatus
end

-- Wait --------------------------------------------------------------------------------------------

Wait = setmetatable({}, {
    __index = Action
})
Wait.__index = Wait
function Wait:new(time)
    local instance = setmetatable(Action:new(), self)
    instance.durationMs = time
    instance.startTime = unixTime()
    return instance
end
function Wait:update()
    local now = unixTime()
    local elapsed = now - self.startTime

    if elapsed >= self.durationMs then
        return BehaviorStatus.SUCCESS
    else
        return BehaviorStatus.RUNNING
    end
end

function Wait:onInitialize()
    Action.onInitialize(self)
    self.startTime = unixTime()
end

-- NavigateToPosition --------------------------------------------------------------------------------------------

NavigateToPosition = setmetatable({}, {
    __index = Action
})
NavigateToPosition.__index = NavigateToPosition

function NavigateToPosition:new(target)
    local instance = setmetatable(Action:new(), self)
    instance.self = self
    instance.target = target
    instance.didReachTarget = false
    instance.agent = getAgentComponent()

    if (instance.agent == nil) then
        throw("Agent must be attached to entity using the Navigate BT nodes.")
    end

    instance.x = 0
    instance.y = 0
    instance.targetX = NaN
    instance.targetY = NaN
    instance.start = 0

    return instance
end

function NavigateToPosition:calcTargetXY()
    local targetX, targetY
    if type(self.target) == 'function' then
        local res = self.target()
        if res then
            targetX = res.x
            targetY = res.y
        else
            targetX = NaN
            targetY = NaN
        end
    else
        targetX = self.target.x
        targetY = self.target.y
    end
    self.targetX = targetX
    self.targetY = targetY
end

function NavigateToPosition:onInitialize()
    Action.onInitialize(self)
    self.start = unixTime()
    self:calcTargetXY()
    local dist = math.sqrt((self.x - self.targetX) ^ 2 + (self.y - self.targetY) ^ 2)
    if dist < 5 then
        self.didReachTarget = true
        return
    end
    self.agent:setDestination(self.targetX, self.targetY);
end

function NavigateToPosition:update()
    local now = unixTime()
    local diff = now - self.start

    if self.didReachTarget or self.agent:hasReachedDestination() then
        return BehaviorStatus.SUCCESS
    end
    return BehaviorStatus.RUNNING
end

function NavigateToPosition:abort()
    print('navigate abort')
    self.agent:clearDestination()
    self.didReachTarget = false
    self.status = BehaviorStatus.FAILURE
end

function NavigateToPosition:onTerminate()
    Behavior.onTerminate(self)
    self.agent:clearDestination()
    self.didReachTarget = false
    self.status = BehaviorStatus.TERMINATED
end

-- Queries --------------------------------------------------------------------------------------------

BBFindClosestTagged = setmetatable({}, {
    __index = Behavior
})
BBFindClosestTagged.__index = BBFindClosestTagged

function BBFindClosestTagged:new(blackboard, kind, output_id)
    local instance = setmetatable(Behavior:new(), self)
    instance.self = self
    instance.kind = kind
    instance.output_id = output_id
    instance.blackboard = blackboard

    return instance
end

function BBFindClosestTagged:update()
    local found = self.blackboard:getTagged(self.kind)
    if (found) then
        print("Found closest " .. self.kind .. ", setting as " .. self.output_id)
        self.blackboard:set(self.output_id, found[1])
        return BehaviorStatus.SUCCESS
    end

    print("Did not find closest " .. self.kind)
    return BehaviorStatus.FAILURE
end

BBHasEntrySet = setmetatable({}, {
    __index = Decorator
})
BBHasEntrySet.__index = BBHasEntrySet

function BBHasEntrySet:new(blackboard, output_id)
    local instance = setmetatable(Decorator:new(), self)
    instance.self = self
    instance.output_id = output_id
    instance.blackboard = blackboard

    return instance
end

function BBHasEntrySet:update()
    local found = self.blackboard:get(self.output_id)
    if (found) then
        return BehaviorStatus.SUCCESS
    end
    return BehaviorStatus.FAILURE
end

NavigateToBBEntry = setmetatable({}, {
    __index = NavigateToPosition
})
NavigateToBBEntry.__index = NavigateToBBEntry

function NavigateToBBEntry:new(blackboard, target_id)
    local instance = setmetatable(Action:new(), self)
    instance.self = self
    instance.blackboard = blackboard
    instance.target_id = target_id
    instance.didReachTarget = false
    instance.agent = getAgentComponent()
    if (instance.agent == nil) then
        throw("Agent must be attached to entity using the Navigate BT nodes.")
    end

    instance.x = 0
    instance.y = 0
    instance.targetX = NaN
    instance.targetY = NaN

    return instance
end

function NavigateToBBEntry:calcTargetXY()
    local target = self.blackboard:get(self.target_id)
    if (target == nil) then
        throw("No target found in blackboard for target: " .. self.target_id)
    end

    self.targetX = target.x
    self.targetY = target.y
end

-- TODO: BB Inventory actions (add, remove, etc)
