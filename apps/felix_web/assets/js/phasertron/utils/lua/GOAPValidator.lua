GoapValidator = {}
GoapValidator.__index = GoapValidator

function GoapValidator.new(actions)
    local self = setmetatable({}, GoapValidator)
    self.actions = actions
    self.graph = self:buildActionGraph(actions)
    self.keyList = self:generateKeyList(actions)
    return self
end

function GoapValidator:validateState(state, throwIfInvalid)
    local invalid = {}
    for key, _ in pairs(state) do
        if not self.keyList[key] then
            table.insert(invalid, key)
        end
    end

    if throwIfInvalid and #invalid > 0 then
        throw("Invalid state keys found (are they typed correctly?): \n\t" .. table.concat(invalid, "\n\t"))
    end

    return #invalid == 0
end

function GoapValidator:validateActions(throwIfInvalid)
    local unattainableActions = self:findUnattainableActions(self.graph)

    if throwIfInvalid and #unattainableActions > 0 then
        throw("Unreachable actions found: \n\t" .. table.concat(unattainableActions, "\n\t"))
    end

    return #unattainableActions == 0
end

function GoapValidator:generateKeyList(actions)
    local keys = {}
    for _, action in ipairs(actions) do
        for key, _ in pairs(action.preconditions) do
            keys[key] = true
        end
        for key, _ in pairs(action.effects) do
            keys[key] = true
        end
    end
    return keys
end

function GoapValidator:buildActionGraph(actions)
    local graph = {}

    for _, action in ipairs(actions) do
        local hasPreconditions = next(action.preconditions) ~= nil
        if not hasPreconditions then
            goto continue
        end

        if not graph[action.name] then
            graph[action.name] = {}
        end
        local edges = graph[action.name]

        local allPreconditionsSatisfied = true
        for preconditionKey, _ in pairs(action.preconditions) do
            local preconditionSatisfied = false
            for _, otherAction in ipairs(actions) do
                if otherAction == action then
                    goto continue_action_check
                end

                if (otherAction.effects[preconditionKey] or 0) > 0 then
                    preconditionSatisfied = true
                    break
                end

                ::continue_action_check::
            end
            if not preconditionSatisfied then
                allPreconditionsSatisfied = false
                break
            end
        end

        if allPreconditionsSatisfied then
            for _, otherAction in ipairs(actions) do
                if otherAction == action then
                    goto continue_edge_addition
                end

                for effectKey, _ in pairs(otherAction.effects) do
                    if action.preconditions[effectKey] and action.preconditions[effectKey] > 0 then
                        table.insert(edges, otherAction)
                        break
                    end
                end

                ::continue_edge_addition::
            end
        end

        ::continue::
    end
    return graph
end

function GoapValidator:findUnattainableActions(graph)
    local unattainableActions = {}

    for action, edges in pairs(graph) do
        if #edges == 0 then
            table.insert(unattainableActions, action)
        end
    end

    return unattainableActions
end
