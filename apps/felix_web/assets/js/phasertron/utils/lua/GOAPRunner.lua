GoapRunner = {}
GoapRunner.__index = GoapRunner

function GoapRunner:new(planner, initialPlan, worldState)
    local instance = setmetatable({}, self)
    instance.planner = planner
    instance.worldState = worldState or {}
    instance:setPlan(initialPlan)
    return instance
end

function GoapRunner:setPlan(plan)
    self.plan = plan
    self.currentStepIndex = 1
    self.currentTree = plan[1] and plan[1].behaviorTree or nil
end

function GoapRunner:setWorldState(state)
    self.worldState = state
end

function GoapRunner:update()
    if not self.currentTree then
        warn("No current tree attached to GOAP runner..")
        return
    end

    if self.currentStepIndex > #self.plan then
        return
    end

    local action = self.plan[self.currentStepIndex]
    local res = self.currentTree:tick()
    if res == BehaviorStatus.SUCCESS or res == BehaviorStatus.TERMINATED then
        -- update the world state now that this action has been completed
        for key, val in pairs(action.effects or {}) do
            self.worldState[key] = (self.worldState[key] or 0) + val
            if self.worldState[key] <= 0 then
                self.worldState[key] = nil
            end
        end

        self.currentStepIndex = self.currentStepIndex + 1
        if self.currentStepIndex > #self.plan then
            print('Plan complete!')
            -- plan is done!!
            return
        end
        self.currentTree:reset()
        self.currentTree = self.plan[self.currentStepIndex].behaviorTree
    elseif res == BehaviorStatus.FAILURE then
        print('Plan failed! We need a new one!!!')

        self.plan = {}
        self.currentTree:abort()
        self.currentTree = nil

        -- replan - TODO PUT THIS SOMEWHERE ELSE!!!!!!!!
        -- local goalState = {
        --     canTaunt = 1
        -- }
        -- local plan = self.planner:plan(actions, self.worldState, goalState)
        -- if plan then
        --     self:setPlan(plan)
        -- end
        return
    end
end

function GoapRunner:abort()
    self.currentTree:abort()
    self.currentTree = nil
end
