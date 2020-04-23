import json

newSections = 0
newCourses = 0
winterPatch = 0

with open('coursesUpdatedUpdated.json', 'w') as outfile:
    with open('timetable20S.json', 'r') as timetablefile:
        timetable = json.load(timetablefile)
        with open('coursesUpdated.json', 'r') as coursesfile:
            courses = json.load(coursesfile)
            for course in courses:
                latch = False
                course["periods"] = None
                course["offered"] = False
                for ref in timetable["courses"]:
                    if (ref["subj"] == course["department"] and ref["num"] == course["number"]):
                        print("Found matching course: " + ref["subj"] + str(ref["num"]) + " and " + course["department"] + str(course["number"]))
                        if (ref["term"] == 202003):
                            newSections += 1
                            if (not latch): newCourses += 1
                            latch = True
                            if (course["periods"] is None):
                                course["periods"] = [ref["period"]]
                            elif (ref["period"] not in course["periods"]):
                                course["periods"].append(ref["period"])
                            if (not course["offered"]):
                                course["offered"] = True
                            if (course["terms_offered"] is None):
                                course["terms_offered"] = ["20S"]
                            elif ("20S" not in course["terms_offered"]):
                                course["terms_offered"].insert(0, "20S")
                        elif (ref["term"] == 202001):
                            winterPatch += 1
                            if (course["terms_offered"] is None):
                                course["terms_offered"] = ["20W"]
                            elif ("20W" not in course["terms_offered"]):
                                course["terms_offered"].insert(0, "20W")


            json.dump(courses, outfile)

print("Winter Patches: " + str(winterPatch))
print("New Sections: " + str(newSections))
print("New Courses: " + str(newCourses))