GoapUtils = {}

function GoapUtils.statesEqual(a, b)
    for key, value in pairs(a) do
        if b[key] ~= value then
            return false
        end
    end
    for key, value in pairs(b) do
        if a[key] ~= value then
            return false
        end
    end
    return true
end

function GoapUtils.calculateEffectsDistance(action, state)
    local dist = 0
    for effectKey, fxVal in pairs(action.effects) do
        if state[effectKey] == nil then
            dist = dist + math.abs(fxVal)
        else
            if fxVal < state[effectKey] then
                dist = dist + math.abs(fxVal - state[effectKey])
            end
        end
    end

    for stateKey, stateValue in pairs(state) do
        if action.effects[stateKey] == nil then
            dist = dist + math.abs(stateValue)
        end
    end
    return dist
end

function GoapUtils.actionCanContribute(action, state)
    for key, stateValue in pairs(state) do
        local fxValue = action.effects[key] or 0
        local sValue = stateValue or 0
        if fxValue > 0 or fxValue >= sValue then
            return true
        end
        if fxValue < 0 and sValue <= fxValue then
            return true
        end
    end
    return false
end

function GoapUtils.getBadnessScore(thread)
    local score = thread.totalCost
    local numActions = #thread.plan
    score = score + numActions
    for i = 1, numActions - 1 do
        if thread.plan[i].name == thread.plan[i + 1].name then
            score = score - 10
        end
    end
    return score
end

GoapPlanner = {}
function GoapPlanner:new()
    newObj = {
        queue = DoublyLinkedList:new()
    }
    self.__index = self
    return setmetatable(newObj, self)
end

function GoapPlanner:plan(actions, startState, goalState)
    print('Planning...')

    -- Sort actions by cost
    table.sort(actions, function(a, b)
        return a.cost < b.cost
    end)

    self.queue = DoublyLinkedList:new() -- Re-initialize the queue for each planning attempt
    self.queue:insertFirst({
        plan = {},
        state = goalState,
        totalCost = 0
    })

    local considerCount = 0
    while not self.queue:isEmpty() do
        local current = self.queue:removeFirst()
        considerCount = considerCount + 1

        if considerCount > 1000 then
            print('Considered ' .. considerCount .. ' plans, giving up.')
            return nil
        end

        for _, action in ipairs(actions) do
            if GoapUtils.actionCanContribute(action, current.state) then
                local newState = {}
                for k, v in pairs(current.state) do
                    newState[k] = v
                end

                -- Apply effects
                for key, val in pairs(action.effects) do
                    newState[key] = (newState[key] or 0) - val
                    if newState[key] <= 0 then
                        newState[key] = nil
                    end
                end

                -- Merge preconditions into the new state
                for key, val in pairs(action.preconditions) do
                    newState[key] = math.max(newState[key] or 0, val)
                    if newState[key] <= 0 then
                        newState[key] = nil
                    end
                end

                local newPlan = {table.unpack(current.plan)}

                table.insert(newPlan, action)

                local dist = GoapUtils.calculateEffectsDistance(action, current.state)
                local nextThread = {
                    plan = newPlan,
                    state = newState,
                    totalCost = current.totalCost + dist + (action.cost * 10)
                }

                if GoapUtils.statesEqual(newState, startState) then
                    -- Reverse the plan to match the original action sequence
                    local finalPlan = {}

                    for i = #nextThread.plan, 1, -1 do
                        table.insert(finalPlan, nextThread.plan[i])
                    end
                    print('Found plan after ' .. considerCount .. ' considerations!')
                    return finalPlan
                end

                -- heuristic
                local head = self.queue:getHead()
                if not head then
                    self.queue:insertLast(nextThread)
                else
                    local headScore = GoapUtils.getBadnessScore(head)
                    local nextScore = GoapUtils.getBadnessScore(nextThread)
                    if headScore <= nextScore then
                        self.queue:insertLast(nextThread)
                    else
                        self.queue:insertFirst(nextThread)
                    end
                end
            end
        end
    end

    print('No plan found after ' .. considerCount .. ' considerations.')
    return nil
end

-- Utility function for reversing tables
function reverseTable(tbl)
    local size = #tbl
    local newTbl = {}
    for i, v in ipairs(tbl) do
        newTbl[size - i + 1] = v
    end
    return newTbl
end

-- Example actions setup
-- actions = {{
--     preconditions = {},
--     effects = {
--         hasCover = 1
--     },
--     cost = 1,
--     name = 'findCover'
-- }, {
--     preconditions = {
--         hasCover = 1
--     },
--     effects = {
--         isHidden = 1
--     },
--     cost = 1,
--     name = 'hide'
-- }, {
--     preconditions = {},
--     effects = {
--         hasShots = 1
--     },
--     cost = 3,
--     name = 'reload'
-- }, {
--     preconditions = {
--         hasShots = 1
--     },
--     effects = {
--         hasVisual = 1
--     },
--     cost = 2,
--     name = 'searchForOpponent'
-- }, {
--     preconditions = {
--         hasShots = 1,
--         hasVisual = 1
--     },
--     effects = {
--         opponentHit = 1,
--         hasShots = -1
--     },
--     cost = 2,
--     name = 'shoot'
-- }, {
--     preconditions = {
--         opponentHit = 1
--     },
--     effects = {
--         canTaunt = 1
--     },
--     cost = 1,
--     name = 'taunt'
-- }, {
--     preconditions = {},
--     effects = {
--         atStartPoint = 1
--     },
--     cost = 5,
--     name = 'returnToStart'
-- }, {
--     preconditions = {
--         hasCover = 1,
--         isHidden = 0
--     },
--     effects = {
--         isHidden = 1
--     },
--     cost = 2,
--     name = 'duckAndHide'
-- }, {
--     preconditions = {
--         hasShots = 0
--     },
--     effects = {
--         seekAmmo = 1
--     },
--     cost = 3,
--     name = 'seekAmmo'
-- }, {
--     preconditions = {
--         seekAmmo = 1
--     },
--     effects = {
--         hasShots = 1
--     },
--     cost = 2,
--     name = 'pickUpAmmo'
-- }, {
--     preconditions = {
--         isHidden = 1,
--         hasVisual = 0
--     },
--     effects = {
--         hasVisual = 1
--     },
--     cost = 3,
--     name = 'peekForOpponent'
-- }}
