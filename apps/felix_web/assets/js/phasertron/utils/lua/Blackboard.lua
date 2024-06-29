Blackboard = {}
Blackboard.__index = Blackboard

function Blackboard:new()
    local newBlackboard = {}
    setmetatable(newBlackboard, Blackboard)
    newBlackboard.data = {}
    newBlackboard.taggedObjects = {}
    return newBlackboard
end

function Blackboard:set(key, value)
    print("\t blackboard setting " .. key)
    if (value == nil) then
        throw("setting " .. key .. " as nil")
    end
    self.data[key] = value
end

function Blackboard:get(key, fallback)
    return self.data[key] or fallback or nil
end

function Blackboard:tagObject(tags, gameObject)
    -- tags might just be a string - convert to table if so
    if type(tags) == "string" then
        tags = {tags}
    end

    for i, tag in ipairs(tags) do
        self.taggedObjects[tag] = self.taggedObjects[tag] or {}
        table.insert(self.taggedObjects[tag], gameObject)

        print("Added object to " .. tag .. " category (" .. #self.taggedObjects[tag] .. ")")
    end
end

function Blackboard:removeObjectTags(tags, gameObject)
    for i, tag in ipairs(tags) do
        if  self.taggedObjects[tag] then
            for j, object in ipairs(self.taggedObjects[tag]) do
                if object == gameObject then
                    table.remove(self.taggedObjects[tag], j)
                end
            end
        end
    end
end

function Blackboard:getTagged(tag)
    return self.taggedObjects[tag] or nil
end

return Blackboard
